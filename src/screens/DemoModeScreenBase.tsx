import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MapViewComponent } from '../components/MapViewComponent';
import { NavigationBottomCard } from '../components/NavigationBottomCard';
import { NavigationInstructionCard } from '../components/NavigationInstructionCard';
import { NavigationSideControls } from '../components/NavigationSideControls';
import { SpeedLimitBox } from '../components/SpeedLimitBox';
import { TutorApproachAlert } from '../components/TutorApproachAlert';
import { TutorCompletionToast } from '../components/TutorCompletionToast';
import { TutorSafeCard } from '../components/TutorSafeCard';
import { DEFAULT_TUTOR_SEGMENTS } from '../data/defaultTutorSegments';
import { Coordinate, MapDisplayType, RouteInfo } from '../types/navigation';
import { TutorSegment } from '../types/tutor';
import { calculateAverageSpeed, calculateRecommendedSpeed, getTutorStatus } from '../utils/tutorCalculations';
import { calculateDistanceBetweenCoordinates } from '../utils/geo';
import { calculateBearing } from '../utils/motion';
import { findTutorSegmentsOnRoute, getRouteLengthKm, getRouteProgress } from '../utils/routeProgress';
import { getContextualManeuverRouteCue } from '../utils/routeArrows';

const DEMO_SEGMENT =
  DEFAULT_TUTOR_SEGMENTS.find((segment) => segment.name === 'Tutor prova Cavin Caselle') ??
  DEFAULT_TUTOR_SEGMENTS[0];

const DEMO_START: Coordinate = { latitude: 45.4849562, longitude: 12.0346642 };
const DEMO_TUTOR_START: Coordinate = { latitude: 45.485453, longitude: 12.031735 };
const DEMO_TUTOR_END: Coordinate = { latitude: 45.488636, longitude: 12.014756 };

const DEMO_POLYLINE: Coordinate[] = [
  DEMO_START,
  DEMO_TUTOR_START,
  { latitude: 45.48612, longitude: 12.0281 },
  { latitude: 45.48722, longitude: 12.02235 },
  DEMO_TUTOR_END,
  { latitude: 45.48902, longitude: 12.01205 },
];

const getSegmentDistanceKm = (start: Coordinate, end: Coordinate): number => {
  return calculateDistanceBetweenCoordinates(start.latitude, start.longitude, end.latitude, end.longitude);
};

const getDemoRoute = (): RouteInfo => {
  const distanceKm = getRouteLengthKm(DEMO_POLYLINE);
  const approachKm = getRouteLengthKm(DEMO_POLYLINE.slice(0, 2));
  const tutorKm = getRouteLengthKm(DEMO_POLYLINE.slice(1, 5));
  const exitKm = Math.max(0.05, distanceKm - approachKm - tutorKm);

  return {
    polyline: DEMO_POLYLINE,
    distanceKm,
    durationMinutes: Math.max(1, (distanceKm / 48) * 60),
    instructions: [
      {
        text: 'Prosegui verso Cavin Caselle',
        streetName: 'Via Cavin Caselle',
        maneuverType: 'depart',
        distanceKm: approachKm,
        durationMinutes: 0.5,
        location: DEMO_POLYLINE[0],
      },
      {
        text: 'Entra nel tratto Tutor Cavin Caselle',
        streetName: 'Cavin Caselle',
        maneuverType: 'turn',
        modifier: 'left',
        distanceKm: 0.08,
        durationMinutes: 0.6,
        location: DEMO_TUTOR_START,
      },
      {
        text: 'Attraversa il tratto Tutor',
        streetName: 'Tutor prova Cavin Caselle',
        maneuverType: 'continue',
        distanceKm: Math.max(0.1, tutorKm - 0.08),
        durationMinutes: 1.7,
        location: DEMO_TUTOR_START,
      },
      {
        text: 'Destinazione demo raggiunta',
        streetName: 'Fine prova Tutor Safe',
        maneuverType: 'arrive',
        distanceKm: exitKm,
        durationMinutes: 0.3,
        location: DEMO_POLYLINE[DEMO_POLYLINE.length - 1],
      },
    ],
  };
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const getPointAtDistance = (polyline: Coordinate[], targetDistanceKm: number): {
  coordinate: Coordinate;
  heading: number | null;
} => {
  if (polyline.length === 0) {
    return { coordinate: { latitude: 0, longitude: 0 }, heading: null };
  }
  if (polyline.length === 1 || targetDistanceKm <= 0) {
    const heading = polyline[1] ? calculateBearing(polyline[0], polyline[1]) : null;
    return { coordinate: polyline[0], heading };
  }

  let travelledKm = 0;
  for (let index = 1; index < polyline.length; index += 1) {
    const previous = polyline[index - 1];
    const current = polyline[index];
    const segmentKm = getSegmentDistanceKm(previous, current);

    if (travelledKm + segmentKm >= targetDistanceKm) {
      const ratio = segmentKm > 0 ? (targetDistanceKm - travelledKm) / segmentKm : 0;
      return {
        coordinate: {
          latitude: previous.latitude + (current.latitude - previous.latitude) * ratio,
          longitude: previous.longitude + (current.longitude - previous.longitude) * ratio,
        },
        heading: calculateBearing(previous, current),
      };
    }

    travelledKm += segmentKm;
  }

  const last = polyline[polyline.length - 1];
  const previous = polyline[polyline.length - 2];
  return { coordinate: last, heading: calculateBearing(previous, last) };
};

const getDemoSpeedKmh = (travelledKm: number, tutorStartKm: number, tutorEndKm: number): number => {
  if (travelledKm < tutorStartKm) return 42;
  if (travelledKm < tutorStartKm + (tutorEndKm - tutorStartKm) * 0.52) return 56;
  if (travelledKm < tutorEndKm) return 44;
  return 38;
};

const getDemoExplanation = (
  isTutorActive: boolean,
  isTutorCompleted: boolean,
  tutorApproachKm: number,
  statusText: string
): { title: string; body: string } => {
  if (isTutorCompleted) {
    return {
      title: 'Tutor terminato',
      body: "Media finale calcolata. La navigazione demo continua pulita dopo l'uscita dal tratto.",
    };
  }

  if (isTutorActive) {
    return {
      title: statusText === 'Media alta' ? 'Media alta' : 'Tutor attivo',
      body: 'Da questo punto Tutor Safe calcola la velocita media e la confronta con il limite del tratto.',
    };
  }

  if (tutorApproachKm <= 1) {
    return {
      title: 'Demo Tutor Safe',
      body: "Tra poco entrerai in un tratto controllato da Tutor. L'app calcolera la velocita media fino all'uscita.",
    };
  }

  return {
    title: 'Navigazione demo',
    body: 'La freccia segue il percorso e il Tutor viene segnalato prima dell ingresso.',
  };
};

interface Props {
  navigation: any;
}

export const DemoModeScreenBase: React.FC<Props> = ({ navigation }) => {
  const route = useMemo(() => getDemoRoute(), []);
  const tutorMatch = useMemo(
    () => findTutorSegmentsOnRoute(route, [DEMO_SEGMENT as TutorSegment])[0] ?? null,
    [route]
  );
  const [travelledKm, setTravelledKm] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [followUser, setFollowUser] = useState(true);
  const [mapType, setMapType] = useState<MapDisplayType>('hybrid');
  const [recenterRequestId, setRecenterRequestId] = useState(0);
  const [overlayResetKey, setOverlayResetKey] = useState(0);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const tutorEntrySecondsRef = useRef<number | null>(null);
  const tutorCompletedRef = useRef(false);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tutorStartKm = tutorMatch?.startDistanceKm ?? 0.7;
  const tutorEndKm = tutorMatch?.endDistanceKm ?? Math.min(route.distanceKm, tutorStartKm + 1.3);
  const currentSpeedKmh = getDemoSpeedKmh(travelledKm, tutorStartKm, tutorEndKm);
  const userPose = getPointAtDistance(route.polyline, travelledKm);
  const progress = getRouteProgress(route, userPose.coordinate);
  const isTutorActive = Boolean(
    tutorMatch &&
      travelledKm >= tutorStartKm &&
      travelledKm <= tutorEndKm &&
      !tutorCompletedRef.current
  );
  const tutorDistanceTravelledKm = clamp(travelledKm - tutorStartKm, 0, Math.max(0.01, tutorEndKm - tutorStartKm));
  const tutorSessionInProgress = tutorEntrySecondsRef.current !== null || isTutorActive;
  const tutorElapsedSeconds =
    tutorEntrySecondsRef.current === null ? 1 : Math.max(1, elapsedSeconds - tutorEntrySecondsRef.current);
  const averageSpeedKmh = tutorSessionInProgress
    ? calculateAverageSpeed(tutorDistanceTravelledKm, tutorElapsedSeconds)
    : 0;
  const recommendedSpeedKmh = isTutorActive
    ? calculateRecommendedSpeed(
        Math.max(0.01, tutorEndKm - tutorStartKm),
        tutorDistanceTravelledKm,
        tutorElapsedSeconds,
        DEMO_SEGMENT.speed_limit_kmh
      )
    : null;
  const tutorStatus = getTutorStatus(averageSpeedKmh, DEMO_SEGMENT.speed_limit_kmh);
  const tutorRemainingKm = Math.max(0, tutorEndKm - travelledKm);
  const tutorApproachKm = Math.max(0, tutorStartKm - travelledKm);
  const maneuverCue = getContextualManeuverRouteCue(route, progress ?? null);
  const eta = new Date(Date.now() + (progress?.durationRemainingMinutes ?? 0) * 60_000);
  const statusLabel = tutorStatus === 'over_limit' ? 'Media alta' : 'OK';
  const explanation = getDemoExplanation(
    isTutorActive,
    tutorCompletedRef.current,
    tutorApproachKm,
    statusLabel
  );

  useEffect(() => {
    if (!isRunning) return undefined;

    const interval = setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 3);
      setTravelledKm((distance) => {
        const speed = getDemoSpeedKmh(distance, tutorStartKm, tutorEndKm);
        return Math.min(route.distanceKm, distance + (speed * 3) / 3600);
      });
    }, 650);

    return () => clearInterval(interval);
  }, [isRunning, route.distanceKm, tutorEndKm, tutorStartKm]);

  useEffect(() => {
    if (isTutorActive && tutorEntrySecondsRef.current === null) {
      tutorEntrySecondsRef.current = elapsedSeconds;
      setCompletionMessage(null);
    }

    if (tutorMatch && travelledKm > tutorEndKm && tutorEntrySecondsRef.current !== null && !tutorCompletedRef.current) {
      tutorCompletedRef.current = true;
      const message = `Tratto Tutor terminato. Media finale: ${Math.round(averageSpeedKmh)} km/h.`;
      setCompletionMessage(message);
      tutorEntrySecondsRef.current = null;
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }
      completionTimerRef.current = setTimeout(() => setCompletionMessage(null), 5200);
    }

    if (travelledKm >= route.distanceKm) {
      setIsRunning(false);
    }
  }, [averageSpeedKmh, elapsedSeconds, isTutorActive, route.distanceKm, travelledKm, tutorEndKm, tutorMatch]);

  useEffect(() => {
    return () => {
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }
    };
  }, []);

  const resetDemo = () => {
    tutorEntrySecondsRef.current = null;
    tutorCompletedRef.current = false;
    setCompletionMessage(null);
    setElapsedSeconds(0);
    setTravelledKm(0);
    setIsRunning(true);
    setFollowUser(true);
    setOverlayResetKey((value) => value + 1);
    setRecenterRequestId((value) => value + 1);
  };

  return (
    <View style={styles.container}>
      <MapViewComponent
        userLocation={userPose.coordinate}
        origin={route.polyline[0]}
        route={route}
        tutorSegments={tutorMatch ? [DEMO_SEGMENT] : []}
        activeTutorSegment={isTutorActive ? DEMO_SEGMENT : null}
        destination={route.polyline[route.polyline.length - 1]}
        heading={userPose.heading}
        isNavigating
        mapType={mapType}
        maneuverCue={maneuverCue}
        overlayResetKey={overlayResetKey}
        followUserLocation={followUser}
        recenterRequestId={recenterRequestId}
        onUserGesture={() => setFollowUser(false)}
      />

      <View style={styles.demoBadge}>
        <Text style={styles.demoBadgeText}>Demo Tutor Safe</Text>
        <TouchableOpacity style={styles.demoAction} onPress={resetDemo}>
          <Text style={styles.demoActionText}>Riavvia</Text>
        </TouchableOpacity>
      </View>

      <NavigationInstructionCard
        instruction={progress?.currentInstruction ?? null}
        nextInstruction={progress?.nextInstruction ?? null}
        currentRoadName={progress?.currentRoadName ?? 'Cavin Caselle'}
        distanceToManeuverKm={progress?.instructionDistanceRemainingKm ?? null}
        isOffRoute={false}
        isRerouting={false}
      />

      {tutorMatch && !isTutorActive && !tutorCompletedRef.current && tutorApproachKm <= 1 ? (
        <TutorApproachAlert segment={DEMO_SEGMENT} distanceKm={tutorApproachKm} />
      ) : null}

      <View style={[styles.explainCard, isTutorActive && styles.explainCardActive]}>
        <Text style={styles.explainTitle}>{explanation.title}</Text>
        <Text style={styles.explainBody}>{explanation.body}</Text>
      </View>

      {isTutorActive ? (
        <TutorSafeCard
          segment={DEMO_SEGMENT}
          averageSpeedKmh={averageSpeedKmh}
          currentSpeedKmh={currentSpeedKmh}
          recommendedSpeedKmh={recommendedSpeedKmh}
          distanceRemainingKm={tutorRemainingKm}
          timeRemainingMinutes={(tutorRemainingKm / Math.max(1, currentSpeedKmh)) * 60}
          status={tutorStatus}
        />
      ) : null}

      {completionMessage ? <TutorCompletionToast message={completionMessage} /> : null}

      <NavigationSideControls
        isFollowingUser={followUser}
        mapType={mapType}
        onRecenter={() => {
          setFollowUser(true);
          setRecenterRequestId((value) => value + 1);
        }}
        onToggleMapType={() => setMapType((current) => (current === 'hybrid' ? 'standard' : 'hybrid'))}
      />

      <SpeedLimitBox
        currentSpeedKmh={currentSpeedKmh}
        speedLimitKmh={isTutorActive || tutorApproachKm <= 1 ? DEMO_SEGMENT.speed_limit_kmh : null}
      />

      <NavigationBottomCard
        distanceRemainingKm={progress?.distanceRemainingKm ?? Math.max(0, route.distanceKm - travelledKm)}
        durationRemainingMinutes={progress?.durationRemainingMinutes ?? 0}
        eta={eta}
        onStop={() => navigation.goBack()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  demoBadge: {
    position: 'absolute',
    top: 10,
    left: 18,
    right: 18,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(10,18,32,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.2)',
    paddingLeft: 12,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  demoBadgeText: {
    color: '#BAE6FD',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  demoAction: {
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,211,238,0.16)',
  },
  demoActionText: {
    color: '#E0F2FE',
    fontSize: 11,
    fontWeight: '900',
  },
  explainCard: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 150,
    borderRadius: 16,
    backgroundColor: 'rgba(10,18,32,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.22)',
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  explainCardActive: {
    borderColor: 'rgba(251,146,60,0.55)',
    backgroundColor: 'rgba(30,20,36,0.88)',
  },
  explainTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '900',
  },
  explainBody: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 4,
  },
});
