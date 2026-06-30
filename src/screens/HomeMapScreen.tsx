import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { MapViewComponent } from '../components/MapViewComponent';
import { SearchBar } from '../components/SearchBar';
import { RoutePreviewCard } from '../components/RoutePreviewCard';
import { NavigationBottomCard } from '../components/NavigationBottomCard';
import { TutorSafeCard } from '../components/TutorSafeCard';
import { OriginChoiceCard } from '../components/OriginChoiceCard';
import { NavigationInstructionCard } from '../components/NavigationInstructionCard';
import { TutorApproachAlert } from '../components/TutorApproachAlert';
import { useLocationStore } from '../store/locationStore';
import { useNavigationStore } from '../store/navigationStore';
import { useTutorStore } from '../store/tutorStore';
import { getDirections } from '../api/googleDirections';
import { isNearPoint, calculateDistanceBetweenCoordinates } from '../utils/geo';
import { calculateAverageSpeed, calculateRecommendedSpeed, getTutorStatus } from '../utils/tutorCalculations';
import { speak } from '../utils/speech';
import { Coordinate, Place, RouteProgress } from '../types/navigation';
import { LocationData } from '../types/location';
import {
  RouteTutorMatch,
  findTutorSegmentsOnRoute,
  getRouteProgress,
  getUpcomingTutorMatch,
} from '../utils/routeProgress';

const TUTOR_WARNING_DISTANCE_KM = 1;
const REROUTE_COOLDOWN_MS = 15_000;
const ARRIVAL_THRESHOLD_KM = 0.05;

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const createCurrentLocationPlace = (coordinate: Coordinate): Place => ({
  id: 'current-location',
  name: 'La mia posizione',
  address: 'Posizione GPS attuale',
  location: coordinate,
});

export const HomeMapScreen = ({ navigation }: any) => {
  const { currentLocation, requestLocationPermission } = useLocationStore();
  const {
    origin,
    destination,
    route,
    isNavigating,
    distanceRemainingKm,
    durationRemainingMinutes,
    eta,
    currentInstruction,
    nextInstruction,
    currentRoadName,
    isOffRoute,
    setOrigin,
    setDestination,
    setRoute,
    startNavigation,
    stopNavigation,
    clearNavigationPlan,
    updateRouteProgress,
  } = useNavigationStore();
  const tutorStore = useTutorStore();

  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [isRerouting, setIsRerouting] = useState(false);
  const [routeTutorMatches, setRouteTutorMatches] = useState<RouteTutorMatch[]>([]);
  const [upcomingTutor, setUpcomingTutor] = useState<{
    match: RouteTutorMatch;
    distanceKm: number;
  } | null>(null);

  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const routeTutorMatchesRef = useRef<RouteTutorMatch[]>([]);
  const activeTutorMatchRef = useRef<RouteTutorMatch | null>(null);
  const warnedTutorIdsRef = useRef<Set<string>>(new Set());
  const completedTutorIdsRef = useRef<Set<string>>(new Set());
  const lastTutorCoordinateRef = useRef<Coordinate | null>(null);
  const lastRerouteAtRef = useRef(0);
  const isReroutingRef = useRef(false);
  const handleNavigationTickRef = useRef<(location: LocationData) => void>(() => undefined);

  useEffect(() => {
    routeTutorMatchesRef.current = routeTutorMatches;
  }, [routeTutorMatches]);

  useEffect(() => {
    if (!route) {
      setRouteTutorMatches([]);
      setUpcomingTutor(null);
      return;
    }

    const matches = findTutorSegmentsOnRoute(route, tutorStore.tutorSegments);
    setRouteTutorMatches(matches);
  }, [route, tutorStore.tutorSegments]);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      await useTutorStore.getState().loadTutorSegments();

      const hasPermission = await requestLocationPermission();
      if (!isMounted) return;

      if (!hasPermission) {
        Alert.alert(
          'Permesso posizione non concesso',
          'Puoi cercare un percorso manualmente, ma per la navigazione reale serve la posizione GPS.'
        );
        return;
      }

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1500,
          distanceInterval: 5,
        },
        (location) => {
          const rawSpeed = location.coords.speed;
          const rawHeading = location.coords.heading;
          const locData: LocationData = {
            coordinate: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            },
            speedKmh: typeof rawSpeed === 'number' && rawSpeed >= 0 ? rawSpeed * 3.6 : null,
            heading: typeof rawHeading === 'number' && rawHeading >= 0 ? rawHeading : null,
            timestamp: location.timestamp,
            accuracy: location.coords.accuracy,
          };

          useLocationStore.getState().setCurrentLocation(locData);
          handleNavigationTickRef.current(locData);
        }
      );

      if (isMounted) {
        locationSubscriptionRef.current = sub;
      } else {
        sub.remove();
      }
    };

    init();

    return () => {
      isMounted = false;
      locationSubscriptionRef.current?.remove();
    };
  }, [requestLocationPermission]);

  useEffect(() => {
    if (!origin || !destination || isNavigating) return;

    let cancelled = false;

    const calculateRoute = async () => {
      setIsCalculatingRoute(true);
      const nextRoute = await getDirections(origin.location, destination.location);

      if (cancelled) return;

      if (!nextRoute) {
        setRoute(null);
        Alert.alert('Percorso non trovato', 'Non riesco a calcolare un tragitto per questi punti.');
      } else {
        setRoute(nextRoute);
      }

      setIsCalculatingRoute(false);
    };

    calculateRoute();

    return () => {
      cancelled = true;
    };
  }, [origin, destination, isNavigating, setRoute]);

  const resetTutorRuntime = useCallback(() => {
    setUpcomingTutor(null);
    activeTutorMatchRef.current = null;
    warnedTutorIdsRef.current.clear();
    completedTutorIdsRef.current.clear();
    lastTutorCoordinateRef.current = null;
    tutorStore.reset();
  }, [tutorStore]);

  const cancelPlan = useCallback(() => {
    clearNavigationPlan();
    setDestination(null);
    setRouteTutorMatches([]);
    resetTutorRuntime();
  }, [clearNavigationPlan, resetTutorRuntime, setDestination]);

  const useCurrentLocationAsOrigin = useCallback(() => {
    if (!currentLocation) {
      Alert.alert('Posizione non disponibile', 'Attendi il segnale GPS oppure inserisci un punto di partenza manuale.');
      return;
    }

    setRoute(null);
    setOrigin(createCurrentLocationPlace(currentLocation.coordinate));
  }, [currentLocation, setOrigin, setRoute]);

  const startActiveNavigation = useCallback(() => {
    if (!currentLocation) {
      Alert.alert('GPS non pronto', 'Per avviare la navigazione serve la posizione attuale.');
      return;
    }

    resetTutorRuntime();
    startNavigation();
    speak('Navigazione avviata.');
  }, [currentLocation, resetTutorRuntime, startNavigation]);

  const stopActiveNavigation = useCallback(() => {
    stopNavigation();
    resetTutorRuntime();
  }, [resetTutorRuntime, stopNavigation]);

  const rerouteFromCurrentLocation = useCallback(async (coordinate: Coordinate) => {
    const navState = useNavigationStore.getState();
    if (!navState.destination || isReroutingRef.current) return;

    const now = Date.now();
    if (now - lastRerouteAtRef.current < REROUTE_COOLDOWN_MS) return;

    lastRerouteAtRef.current = now;
    isReroutingRef.current = true;
    setIsRerouting(true);

    const nextRoute = await getDirections(coordinate, navState.destination.location);
    if (nextRoute) {
      const tutorSegments = useTutorStore.getState().tutorSegments;
      const nextMatches = findTutorSegmentsOnRoute(nextRoute, tutorSegments);
      const activeSegment = useTutorStore.getState().activeTutorSegment;

      useNavigationStore.getState().setOrigin(createCurrentLocationPlace(coordinate));
      useNavigationStore.getState().setRoute(nextRoute);
      setRouteTutorMatches(nextMatches);
      activeTutorMatchRef.current = activeSegment
        ? nextMatches.find((match) => match.segment.id === activeSegment.id) ?? null
        : null;
      speak('Percorso ricalcolato.');
    } else {
      speak('Non riesco a ricalcolare il percorso.');
    }

    isReroutingRef.current = false;
    setIsRerouting(false);
  }, []);

  const endTutorSession = useCallback((locData: LocationData) => {
    const tutorState = useTutorStore.getState();
    const activeSegment = tutorState.activeTutorSegment;
    const finalAverage = tutorState.averageSpeedKmh;

    if (activeSegment) {
      completedTutorIdsRef.current.add(activeSegment.id);
    }

    activeTutorMatchRef.current = null;
    lastTutorCoordinateRef.current = null;
    setUpcomingTutor(null);
    speak(`Tratto Tutor terminato. Media finale ${Math.round(finalAverage)} chilometri orari.`);

    tutorState.endTutorSession(locData.coordinate, Date.now()).then((session) => {
      if (session) {
        navigation.navigate('TutorSummary', { session });
      }
    });
  }, [navigation]);

  const handleTutorSafeTick = useCallback((locData: LocationData, progress: RouteProgress) => {
    const tutorState = useTutorStore.getState();
    const matches = routeTutorMatchesRef.current;
    const now = Date.now();

    if (!tutorState.tutorSessionActive) {
      const upcoming = getUpcomingTutorMatch(matches, progress.distanceTravelledKm, TUTOR_WARNING_DISTANCE_KM);

      if (upcoming && !completedTutorIdsRef.current.has(upcoming.segment.id)) {
        const distanceKm = Math.max(0, upcoming.startDistanceKm - progress.distanceTravelledKm);
        setUpcomingTutor({ match: upcoming, distanceKm });

        if (!warnedTutorIdsRef.current.has(upcoming.segment.id)) {
          const meters = Math.max(50, Math.round(distanceKm * 1000));
          speak(`Tra ${meters} metri entri in un tratto controllato da Tutor.`);
          warnedTutorIdsRef.current.add(upcoming.segment.id);
        }
      } else {
        setUpcomingTutor(null);
      }

      const enteringMatch = matches.find((match) => {
        if (completedTutorIdsRef.current.has(match.segment.id)) return false;

        const segment = match.segment;
        const startRadiusKm = Math.max(segment.start_radius_meters / 1000, 0.12);
        const isCloseByRoute = Math.abs(progress.distanceTravelledKm - match.startDistanceKm) <= startRadiusKm;
        const isCloseByGps = isNearPoint(
          locData.coordinate.latitude,
          locData.coordinate.longitude,
          segment.start_latitude,
          segment.start_longitude,
          segment.start_radius_meters
        );

        return (
          progress.distanceTravelledKm <= match.endDistanceKm &&
          (isCloseByRoute || isCloseByGps)
        );
      });

      if (enteringMatch) {
        activeTutorMatchRef.current = enteringMatch;
        lastTutorCoordinateRef.current = locData.coordinate;
        setUpcomingTutor(null);
        tutorState.startTutorSession(enteringMatch.segment, locData.coordinate, now);
        tutorState.setSpokenEntryWarning(true);
        speak('Sei entrato in un tratto controllato da Tutor. Tutor Safe attivo.');
      }

      return;
    }

    const activeSegment = tutorState.activeTutorSegment;
    if (!activeSegment || !tutorState.tutorEntryTime) return;

    const activeMatch =
      activeTutorMatchRef.current ??
      matches.find((match) => match.segment.id === activeSegment.id) ??
      null;

    const endReachedByRoute = activeMatch
      ? progress.distanceTravelledKm >=
        activeMatch.endDistanceKm - Math.max(activeSegment.end_radius_meters / 1000, 0.08)
      : false;
    const endReachedByGps = isNearPoint(
      locData.coordinate.latitude,
      locData.coordinate.longitude,
      activeSegment.end_latitude,
      activeSegment.end_longitude,
      activeSegment.end_radius_meters
    );

    if (endReachedByRoute || endReachedByGps) {
      endTutorSession(locData);
      return;
    }

    let distanceTravelledKm = tutorState.distanceTravelledKm;

    if (activeMatch) {
      distanceTravelledKm = clamp(
        progress.distanceTravelledKm - activeMatch.startDistanceKm,
        0,
        activeSegment.segment_length_km
      );
    } else if (lastTutorCoordinateRef.current) {
      const last = lastTutorCoordinateRef.current;
      const deltaKm = calculateDistanceBetweenCoordinates(
        last.latitude,
        last.longitude,
        locData.coordinate.latitude,
        locData.coordinate.longitude
      );
      distanceTravelledKm = clamp(
        tutorState.distanceTravelledKm + deltaKm,
        0,
        activeSegment.segment_length_km
      );
    }

    lastTutorCoordinateRef.current = locData.coordinate;

    const elapsedSeconds = (now - tutorState.tutorEntryTime) / 1000;
    const averageSpeed = calculateAverageSpeed(distanceTravelledKm, elapsedSeconds);
    const recommendedSpeed = calculateRecommendedSpeed(
      activeSegment.segment_length_km,
      distanceTravelledKm,
      elapsedSeconds,
      activeSegment.speed_limit_kmh
    );
    const status = getTutorStatus(averageSpeed, activeSegment.speed_limit_kmh);

    tutorState.updateTutorSession(distanceTravelledKm, averageSpeed, recommendedSpeed, status);

    if (status === 'over_limit' && !tutorState.hasSpokenOverLimitWarning) {
      speak('Media sopra il limite. Riduci la velocità in sicurezza.');
      tutorState.setSpokenOverLimitWarning(true);
      tutorState.setSpokenReturnSafeWarning(false);
    } else if (
      status === 'safe' &&
      tutorState.hasSpokenOverLimitWarning &&
      !tutorState.hasSpokenReturnSafeWarning
    ) {
      speak('Media tornata entro il limite.');
      tutorState.setSpokenReturnSafeWarning(true);
      tutorState.setSpokenOverLimitWarning(false);
    }
  }, [endTutorSession]);

  const handleNavigationTick = useCallback((locData: LocationData) => {
    const navState = useNavigationStore.getState();
    if (!navState.isNavigating || !navState.route || !navState.destination) return;

    const progress = getRouteProgress(navState.route, locData.coordinate);
    if (!progress) return;

    const instruction = progress.currentInstruction?.text ?? 'Procedi verso la destinazione';
    updateRouteProgress(
      progress.distanceRemainingKm,
      progress.durationRemainingMinutes,
      instruction,
      progress.currentRoadName,
      progress.nextInstruction?.text ?? null,
      progress.isOffRoute
    );

    handleTutorSafeTick(locData, progress);

    if (progress.distanceRemainingKm <= ARRIVAL_THRESHOLD_KM) {
      speak('Sei arrivato a destinazione.');
      stopActiveNavigation();
      return;
    }

    if (progress.isOffRoute) {
      void rerouteFromCurrentLocation(locData.coordinate);
    }
  }, [handleTutorSafeTick, rerouteFromCurrentLocation, stopActiveNavigation, updateRouteProgress]);

  useEffect(() => {
    handleNavigationTickRef.current = handleNavigationTick;
  }, [handleNavigationTick]);

  const activeTutorDistanceRemainingKm = tutorStore.activeTutorSegment
    ? Math.max(0, tutorStore.activeTutorSegment.segment_length_km - tutorStore.distanceTravelledKm)
    : 0;
  const activeTutorTimeRemainingMinutes =
    currentLocation?.speedKmh && currentLocation.speedKmh > 0
      ? (activeTutorDistanceRemainingKm / currentLocation.speedKmh) * 60
      : null;
  const visibleTutorSegments = route ? routeTutorMatches.map((match) => match.segment) : [];

  return (
    <View style={styles.container}>
      <MapViewComponent
        userLocation={currentLocation?.coordinate || null}
        origin={origin?.location || null}
        route={route}
        tutorSegments={visibleTutorSegments}
        activeTutorSegment={tutorStore.activeTutorSegment}
        destination={destination?.location || null}
        heading={currentLocation?.heading ?? null}
        isNavigating={isNavigating}
      />

      {!isNavigating && !destination ? (
        <SearchBar onPress={() => navigation.navigate('SearchDestination', { mode: 'destination' })} />
      ) : null}

      {!isNavigating && destination && !origin ? (
        <OriginChoiceCard
          destination={destination}
          canUseCurrentLocation={Boolean(currentLocation)}
          onUseCurrentLocation={useCurrentLocationAsOrigin}
          onChooseManualOrigin={() => navigation.navigate('SearchDestination', { mode: 'origin' })}
          onCancel={cancelPlan}
        />
      ) : null}

      {!isNavigating && origin && destination && isCalculatingRoute ? (
        <View style={styles.loadingRouteCard}>
          <ActivityIndicator color="#3498db" />
          <Text style={styles.loadingRouteText}>Calcolo percorso migliore...</Text>
        </View>
      ) : null}

      {!isNavigating && origin && destination && route && !isCalculatingRoute ? (
        <RoutePreviewCard
          origin={origin}
          destination={destination}
          route={route}
          tutorSegmentsCount={routeTutorMatches.length}
          onStart={startActiveNavigation}
          onCancel={cancelPlan}
        />
      ) : null}

      {isNavigating ? (
        <>
          <NavigationInstructionCard
            instruction={currentInstruction}
            nextInstruction={nextInstruction}
            currentRoadName={currentRoadName}
            isOffRoute={isOffRoute}
            isRerouting={isRerouting}
          />

          {upcomingTutor && !tutorStore.tutorSessionActive ? (
            <TutorApproachAlert
              segment={upcomingTutor.match.segment}
              distanceKm={upcomingTutor.distanceKm}
            />
          ) : null}

          {tutorStore.tutorSessionActive && tutorStore.activeTutorSegment ? (
            <TutorSafeCard
              segment={tutorStore.activeTutorSegment}
              averageSpeedKmh={tutorStore.averageSpeedKmh}
              currentSpeedKmh={currentLocation?.speedKmh || null}
              recommendedSpeedKmh={tutorStore.recommendedSpeedKmh}
              distanceRemainingKm={activeTutorDistanceRemainingKm}
              timeRemainingMinutes={activeTutorTimeRemainingMinutes}
              status={tutorStore.tutorStatus}
            />
          ) : null}

          <NavigationBottomCard
            distanceRemainingKm={distanceRemainingKm}
            durationRemainingMinutes={durationRemainingMinutes}
            eta={eta}
            onStop={stopActiveNavigation}
          />
        </>
      ) : null}

      {!isNavigating ? (
        <View style={styles.topRightControls}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.iconText}>⚙</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('DemoMode')}>
            <Text style={styles.iconText}>▶</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  loadingRouteCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 40,
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 14,
  },
  loadingRouteText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  topRightControls: {
    position: 'absolute',
    top: 50,
    right: 20,
    gap: 10,
  },
  iconButton: {
    backgroundColor: '#1c1c1e',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  iconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
});
