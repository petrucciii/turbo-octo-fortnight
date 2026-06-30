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
import { NavigationSideControls } from '../components/NavigationSideControls';
import { SpeedLimitBox } from '../components/SpeedLimitBox';
import { TutorCompletionToast } from '../components/TutorCompletionToast';
import { ArrivalPrompt } from '../components/ArrivalPrompt';
import { useLocationStore } from '../store/locationStore';
import { useNavigationStore } from '../store/navigationStore';
import { useTutorStore } from '../store/tutorStore';
import { getDirections } from '../api/googleDirections';
import { isNearPoint, calculateDistanceBetweenCoordinates } from '../utils/geo';
import { calculateAverageSpeed, calculateRecommendedSpeed, getTutorStatus } from '../utils/tutorCalculations';
import { speak } from '../utils/speech';
import { Coordinate, MapDisplayType, Place, RouteProgress } from '../types/navigation';
import { LocationData } from '../types/location';
import {
  RouteTutorMatch,
  findTutorSegmentsOnRoute,
  getRouteProgress,
  getUpcomingTutorMatch,
} from '../utils/routeProgress';
import {
  calculateBearing,
  getFallbackSpeedKmh,
  sanitizeSpeedKmh,
  smoothHeading,
  smoothSpeedKmh,
} from '../utils/motion';
import { distancePointToSegmentMeters } from '../utils/segmentDistance';
import { getContextualManeuverRouteCue } from '../utils/routeArrows';

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

const isValidLocationData = (location: LocationData | null | undefined): location is LocationData => {
  return Boolean(
    location &&
      Number.isFinite(location.coordinate.latitude) &&
      Number.isFinite(location.coordinate.longitude)
  );
};

export const HomeMapScreen = ({ navigation }: any) => {
  const { currentLocation, lastKnownLocation, requestLocationPermission } = useLocationStore();
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
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [mapType, setMapType] = useState<MapDisplayType>('hybrid');
  const [recenterRequestId, setRecenterRequestId] = useState(0);
  const [mapOverlayResetKey, setMapOverlayResetKey] = useState(0);
  const [pendingUseCurrentOrigin, setPendingUseCurrentOrigin] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [currentRouteProgress, setCurrentRouteProgress] = useState<RouteProgress | null>(null);
  const [tutorCompletionMessage, setTutorCompletionMessage] = useState<string | null>(null);
  const [routeTutorMatches, setRouteTutorMatches] = useState<RouteTutorMatch[]>([]);
  const [arrivalPromptVisible, setArrivalPromptVisible] = useState(false);
  const [upcomingTutor, setUpcomingTutor] = useState<{
    match: RouteTutorMatch;
    distanceKm: number;
  } | null>(null);

  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const headingSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const routeTutorMatchesRef = useRef<RouteTutorMatch[]>([]);
  const activeTutorMatchRef = useRef<RouteTutorMatch | null>(null);
  const warnedTutorIdsRef = useRef<Set<string>>(new Set());
  const completedTutorIdsRef = useRef<Set<string>>(new Set());
  const lastTutorCoordinateRef = useRef<Coordinate | null>(null);
  const lastRerouteAtRef = useRef(0);
  const isReroutingRef = useRef(false);
  const lastMotionSampleRef = useRef<{ coordinate: Coordinate; timestamp: number } | null>(null);
  const lastStableHeadingRef = useRef<number | null>(null);
  const lastStableSpeedRef = useRef<number | null>(null);
  const deviceHeadingRef = useRef<number | null>(null);
  const arrivalHandledRef = useRef(false);
  const routeRequestIdRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleNavigationTickRef = useRef<(location: LocationData) => void>(() => undefined);
  const storeUserLocation = isValidLocationData(currentLocation)
    ? currentLocation
    : isValidLocationData(lastKnownLocation)
      ? lastKnownLocation
      : null;
  const [persistentUserLocation, setPersistentUserLocation] = useState<LocationData | null>(
    storeUserLocation
  );

  useEffect(() => {
    routeTutorMatchesRef.current = routeTutorMatches;
  }, [routeTutorMatches]);

  useEffect(() => {
    if (storeUserLocation) {
      setPersistentUserLocation(storeUserLocation);
    }
  }, [storeUserLocation]);

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
    const originLocation = currentLocation ?? lastKnownLocation;
    if (!pendingUseCurrentOrigin || !originLocation) return;

    setPendingUseCurrentOrigin(false);
    setRoute(null);
    setOrigin(createCurrentLocationPlace(originLocation.coordinate));
  }, [currentLocation, lastKnownLocation, pendingUseCurrentOrigin, setOrigin, setRoute]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

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

      const applyLocationObject = (location: Location.LocationObject): LocationData => {
        const rawSpeed = location.coords.speed;
        const rawHeading = location.coords.heading;
        const coordinate = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        const fallbackSpeed = getFallbackSpeedKmh(
          lastMotionSampleRef.current,
          coordinate,
          location.timestamp
        );
        const gpsSpeedKmh = typeof rawSpeed === 'number' && rawSpeed >= 0 ? rawSpeed * 3.6 : null;
        const candidateSpeed = sanitizeSpeedKmh(gpsSpeedKmh) ?? sanitizeSpeedKmh(fallbackSpeed);
        const stableSpeed = smoothSpeedKmh(lastStableSpeedRef.current, candidateSpeed);
        lastStableSpeedRef.current = stableSpeed;
        const fallbackHeading = lastMotionSampleRef.current && sanitizeSpeedKmh(fallbackSpeed) !== null
          ? calculateBearing(lastMotionSampleRef.current.coordinate, coordinate)
          : null;
        const gpsHeading = typeof rawHeading === 'number' && rawHeading >= 0 ? rawHeading : null;
        const candidateHeading =
          stableSpeed !== null && stableSpeed >= 4
            ? fallbackHeading ?? gpsHeading ?? deviceHeadingRef.current
            : deviceHeadingRef.current ?? gpsHeading ?? fallbackHeading;
        const stableHeading = smoothHeading(lastStableHeadingRef.current, candidateHeading, 0.2);
        lastStableHeadingRef.current = stableHeading;

        const locData: LocationData = {
          coordinate,
          speedKmh: stableSpeed,
          heading: stableHeading,
          timestamp: location.timestamp,
          accuracy: location.coords.accuracy,
        };

        lastMotionSampleRef.current = { coordinate, timestamp: location.timestamp };
        useLocationStore.getState().setCurrentLocation(locData);
        handleNavigationTickRef.current(locData);

        return locData;
      };

      try {
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (isMounted) {
          applyLocationObject(initialLocation);
          setRecenterRequestId((value) => value + 1);
        }
      } catch (error) {
        console.warn('Initial GPS position unavailable:', error);
      }

      try {
        const headingSub = await Location.watchHeadingAsync((heading) => {
          const rawHeading =
            typeof heading.trueHeading === 'number' && heading.trueHeading >= 0
              ? heading.trueHeading
              : heading.magHeading;
          const stableHeading = smoothHeading(lastStableHeadingRef.current, rawHeading, 0.18);
          if (stableHeading === null) return;

          deviceHeadingRef.current = stableHeading;
          lastStableHeadingRef.current = stableHeading;

          const locationStoreState = useLocationStore.getState();
          const locationState = locationStoreState.currentLocation ?? locationStoreState.lastKnownLocation;
          const currentSpeed = sanitizeSpeedKmh(locationState?.speedKmh);
          const locationAgeMs = locationState ? Date.now() - locationState.timestamp : Number.POSITIVE_INFINITY;
          const shouldUseDeviceHeading = currentSpeed === null || currentSpeed < 4 || locationAgeMs > 2500;

          if (locationState && shouldUseDeviceHeading) {
            const updatedLocation: LocationData = {
              ...locationState,
              heading: stableHeading,
              timestamp: Date.now(),
            };
            useLocationStore.getState().setCurrentLocation(updatedLocation);
            handleNavigationTickRef.current(updatedLocation);
          }
        });

        if (isMounted) {
          headingSubscriptionRef.current = headingSub;
        } else {
          headingSub.remove();
        }
      } catch (error) {
        console.warn('Heading watch unavailable:', error);
      }

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1500,
          distanceInterval: 5,
        },
        (location) => {
          applyLocationObject(location);
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
      headingSubscriptionRef.current?.remove();
    };
  }, [requestLocationPermission]);

  useEffect(() => {
    if (!origin || !destination || isNavigating) return;

    let cancelled = false;
    const requestId = routeRequestIdRef.current + 1;
    routeRequestIdRef.current = requestId;

    const calculateRoute = async () => {
      setIsCalculatingRoute(true);
      setRouteError(null);
      const nextRoute = await getDirections(origin.location, destination.location);

      const latestNavigationState = useNavigationStore.getState();
      const isStaleRequest =
        cancelled ||
        routeRequestIdRef.current !== requestId ||
        !latestNavigationState.origin ||
        !latestNavigationState.destination ||
        latestNavigationState.isNavigating;

      if (isStaleRequest) return;

      if (!nextRoute) {
        setRoute(null);
        setRouteError('Percorso non disponibile. Prova con un altro punto di partenza o destinazione.');
      } else {
        setRoute(nextRoute);
        setRouteError(null);
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
    setTutorCompletionMessage(null);
    activeTutorMatchRef.current = null;
    warnedTutorIdsRef.current.clear();
    completedTutorIdsRef.current.clear();
    lastTutorCoordinateRef.current = null;
    tutorStore.reset();
  }, [tutorStore]);

  const resetNavigationState = useCallback((mode: 'stop' | 'clear') => {
    routeRequestIdRef.current += 1;

    if (mode === 'stop') {
      stopNavigation();
    } else {
      clearNavigationPlan();
    }

    setRoute(null);
    setOrigin(null);
    setDestination(null);
    setIsFollowingUser(false);
    setIsRerouting(false);
    setIsCalculatingRoute(false);
    setPendingUseCurrentOrigin(false);
    setRouteTutorMatches([]);
    setCurrentRouteProgress(null);
    setRouteError(null);
    setArrivalPromptVisible(false);
    setTutorCompletionMessage(null);
    isReroutingRef.current = false;
    arrivalHandledRef.current = false;
    resetTutorRuntime();
    setMapOverlayResetKey((value) => value + 1);
    setRecenterRequestId((value) => value + 1);
  }, [clearNavigationPlan, resetTutorRuntime, setDestination, setOrigin, setRoute, stopNavigation]);

  const logExitSnapshot = useCallback((label: 'BEFORE EXIT' | 'AFTER EXIT') => {
    const locationState = useLocationStore.getState();
    const navigationState = useNavigationStore.getState();

    console.log(label, {
      currentLocation: locationState.currentLocation,
      lastKnownLocation: locationState.lastKnownLocation,
      isNavigating: navigationState.isNavigating,
      route: navigationState.route,
      destination: navigationState.destination,
    });
  }, []);

  const cancelPlan = useCallback(() => {
    resetNavigationState('clear');
  }, [resetNavigationState]);

  const useCurrentLocationAsOrigin = useCallback(() => {
    const originLocation = currentLocation ?? lastKnownLocation;
    if (!originLocation) {
      setPendingUseCurrentOrigin(true);
      return;
    }

    setPendingUseCurrentOrigin(false);
    setRoute(null);
    setOrigin(createCurrentLocationPlace(originLocation.coordinate));
  }, [currentLocation, lastKnownLocation, setOrigin, setRoute]);

  const startActiveNavigation = useCallback(() => {
    const navigationLocation = currentLocation ?? lastKnownLocation;
    if (!navigationLocation) {
      Alert.alert('GPS non pronto', 'Per avviare la navigazione serve la posizione attuale.');
      return;
    }

    resetTutorRuntime();
    arrivalHandledRef.current = false;
    setIsFollowingUser(true);
    setRecenterRequestId((value) => value + 1);
    startNavigation();
    speak('Navigazione avviata.');
  }, [currentLocation, lastKnownLocation, resetTutorRuntime, startNavigation]);

  const stopActiveNavigation = useCallback(() => {
    logExitSnapshot('BEFORE EXIT');
    resetNavigationState('stop');
    setTimeout(() => logExitSnapshot('AFTER EXIT'), 0);
  }, [logExitSnapshot, resetNavigationState]);

  const closeArrivalPrompt = useCallback(() => {
    resetNavigationState('stop');
  }, [resetNavigationState]);

  const startNewDestinationAfterArrival = useCallback(() => {
    resetNavigationState('stop');
    navigation.navigate('SearchDestination', { mode: 'destination' });
  }, [navigation, resetNavigationState]);

  const recenterOnUser = useCallback(() => {
    setIsFollowingUser(true);
    setRecenterRequestId((value) => value + 1);
  }, []);

  const toggleMapType = useCallback(() => {
    setMapType((current) => (current === 'hybrid' ? 'standard' : 'hybrid'));
  }, []);

  const handleMapGesture = useCallback(() => {
    setIsFollowingUser(false);
  }, []);

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
      setCurrentRouteProgress(null);
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
    const message = `Tratto Tutor terminato. Media finale: ${Math.round(finalAverage)} km/h.`;
    setTutorCompletionMessage(message);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setTutorCompletionMessage(null), 6500);
    speak(message);

    tutorState.endTutorSession(locData.coordinate, Date.now());
  }, []);

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
        const segmentDistanceMeters = distancePointToSegmentMeters(
          locData.coordinate,
          { latitude: segment.start_latitude, longitude: segment.start_longitude },
          { latitude: segment.end_latitude, longitude: segment.end_longitude }
        );
        const isCloseByRoute = Math.abs(progress.distanceTravelledKm - match.startDistanceKm) <= startRadiusKm;
        const isCloseByGps = isNearPoint(
          locData.coordinate.latitude,
          locData.coordinate.longitude,
          segment.start_latitude,
          segment.start_longitude,
          segment.start_radius_meters
        );
        const isOnTutorLine =
          segmentDistanceMeters <= Math.max(70, segment.start_radius_meters) &&
          progress.distanceTravelledKm >= match.startDistanceKm - 0.08 &&
          progress.distanceTravelledKm <= match.endDistanceKm + 0.08;

        return (
          progress.distanceTravelledKm <= match.endDistanceKm &&
          (isCloseByRoute || isCloseByGps || isOnTutorLine)
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

    setCurrentRouteProgress(progress);

    const instruction = progress.currentInstruction?.text || 'Prosegui sul percorso';
    updateRouteProgress(
      progress.distanceRemainingKm,
      progress.durationRemainingMinutes,
      instruction,
      progress.currentRoadName || 'Strada senza nome',
      progress.nextInstruction?.text || 'Segui il percorso',
      progress.isOffRoute
    );

    handleTutorSafeTick(locData, progress);

    if (progress.distanceRemainingKm <= ARRIVAL_THRESHOLD_KM && !arrivalHandledRef.current) {
      arrivalHandledRef.current = true;
      speak('Sei arrivato a destinazione.');
      resetNavigationState('stop');
      setArrivalPromptVisible(true);
      return;
    }

    if (progress.isOffRoute) {
      void rerouteFromCurrentLocation(locData.coordinate);
    }
  }, [handleTutorSafeTick, rerouteFromCurrentLocation, resetNavigationState, updateRouteProgress]);

  useEffect(() => {
    handleNavigationTickRef.current = handleNavigationTick;
  }, [handleNavigationTick]);

  const visibleUserLocation = storeUserLocation ?? persistentUserLocation;
  const activeTutorDistanceRemainingKm = tutorStore.activeTutorSegment
    ? Math.max(0, tutorStore.activeTutorSegment.segment_length_km - tutorStore.distanceTravelledKm)
    : 0;
  const activeTutorTimeRemainingMinutes =
    visibleUserLocation?.speedKmh && visibleUserLocation.speedKmh > 0
      ? (activeTutorDistanceRemainingKm / visibleUserLocation.speedKmh) * 60
      : null;
  const activeTutorElapsedSeconds = tutorStore.tutorEntryTime
    ? Math.max(1, (Date.now() - tutorStore.tutorEntryTime) / 1000)
    : null;
  const visibleTutorSegments = route ? routeTutorMatches.map((match) => match.segment) : [];
  const visibleSpeedLimit =
    tutorStore.activeTutorSegment?.speed_limit_kmh ??
    upcomingTutor?.match.segment.speed_limit_kmh ??
    null;
  const maneuverCue = isNavigating
    ? getContextualManeuverRouteCue(route, currentRouteProgress)
    : null;

  return (
    <View style={styles.container}>
      <MapViewComponent
        userLocation={visibleUserLocation?.coordinate || null}
        origin={origin?.location || null}
        route={route}
        tutorSegments={visibleTutorSegments}
        activeTutorSegment={tutorStore.activeTutorSegment}
        destination={destination?.location || null}
        heading={visibleUserLocation?.heading ?? null}
        isNavigating={isNavigating}
        mapType={mapType}
        maneuverCue={maneuverCue}
        overlayResetKey={mapOverlayResetKey}
        followUserLocation={isFollowingUser}
        recenterRequestId={recenterRequestId}
        onUserGesture={handleMapGesture}
      />

      {!isNavigating && !destination ? (
        <SearchBar onPress={() => navigation.navigate('SearchDestination', { mode: 'destination' })} />
      ) : null}

      {!isNavigating && destination && !origin ? (
        <OriginChoiceCard
          destination={destination}
          canUseCurrentLocation
          isWaitingForCurrentLocation={pendingUseCurrentOrigin}
          onUseCurrentLocation={useCurrentLocationAsOrigin}
          onChooseManualOrigin={() => navigation.navigate('SearchDestination', { mode: 'origin' })}
          onCancel={cancelPlan}
        />
      ) : null}

      {!isNavigating && destination && !origin && pendingUseCurrentOrigin ? (
        <View style={styles.loadingRouteCard}>
          <ActivityIndicator color="#3498db" />
          <Text style={styles.loadingRouteText}>Attendo posizione GPS...</Text>
        </View>
      ) : null}

      {!isNavigating && origin && destination && isCalculatingRoute ? (
        <View style={styles.loadingRouteCard}>
          <ActivityIndicator color="#3498db" />
          <Text style={styles.loadingRouteText}>Calcolo percorso migliore...</Text>
        </View>
      ) : null}

      {!isNavigating && origin && destination && routeError && !isCalculatingRoute ? (
        <View style={styles.routeErrorCard}>
          <Text style={styles.routeErrorTitle}>Percorso non disponibile</Text>
          <Text style={styles.routeErrorText}>{routeError}</Text>
          <View style={styles.routeErrorActions}>
            <TouchableOpacity style={styles.routeErrorButton} onPress={cancelPlan}>
              <Text style={styles.routeErrorButtonText}>Cambia destinazione</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.routeErrorButtonPrimary}
              onPress={() => navigation.navigate('SearchDestination', { mode: 'origin' })}
            >
              <Text style={styles.routeErrorButtonPrimaryText}>Cambia partenza</Text>
            </TouchableOpacity>
          </View>
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
            instruction={currentRouteProgress?.currentInstruction ?? null}
            nextInstruction={currentRouteProgress?.nextInstruction ?? null}
            currentRoadName={currentRoadName}
            distanceToManeuverKm={currentRouteProgress?.instructionDistanceRemainingKm ?? null}
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
              currentSpeedKmh={visibleUserLocation?.speedKmh || null}
              recommendedSpeedKmh={tutorStore.recommendedSpeedKmh}
              distanceRemainingKm={activeTutorDistanceRemainingKm}
              timeRemainingMinutes={activeTutorTimeRemainingMinutes}
              status={tutorStore.tutorStatus}
              distanceTravelledKm={tutorStore.distanceTravelledKm}
              elapsedSeconds={activeTutorElapsedSeconds}
            />
          ) : null}

          {tutorCompletionMessage ? (
            <TutorCompletionToast message={tutorCompletionMessage} />
          ) : null}

          <NavigationSideControls
            isFollowingUser={isFollowingUser}
            mapType={mapType}
            onRecenter={recenterOnUser}
            onToggleMapType={toggleMapType}
          />

          <SpeedLimitBox
            currentSpeedKmh={visibleUserLocation?.speedKmh ?? null}
            speedLimitKmh={visibleSpeedLimit}
          />

          <NavigationBottomCard
            distanceRemainingKm={distanceRemainingKm}
            durationRemainingMinutes={durationRemainingMinutes}
            eta={eta}
            onStop={stopActiveNavigation}
          />
        </>
      ) : null}

      {!isNavigating && !origin && !destination && !route ? (
        <View style={styles.topRightControls}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.iconText}>SET</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('DemoMode')}>
            <Text style={styles.iconText}>DEMO</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {arrivalPromptVisible ? (
        <ArrivalPrompt
          onNewDestination={startNewDestinationAfterArrival}
          onClose={closeArrivalPrompt}
        />
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
  routeErrorCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 36,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 14,
  },
  routeErrorTitle: {
    color: '#111',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  routeErrorText: {
    color: '#5f6368',
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 14,
  },
  routeErrorActions: {
    flexDirection: 'row',
    gap: 10,
  },
  routeErrorButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#f1f3f4',
    paddingVertical: 12,
    alignItems: 'center',
  },
  routeErrorButtonPrimary: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#3498db',
    paddingVertical: 12,
    alignItems: 'center',
  },
  routeErrorButtonText: {
    color: '#202124',
    fontSize: 13,
    fontWeight: '800',
  },
  routeErrorButtonPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  topRightControls: {
    position: 'absolute',
    top: 118,
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
    fontSize: 11,
    fontWeight: '800',
  },
});
