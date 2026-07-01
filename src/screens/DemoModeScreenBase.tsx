import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MapViewComponent } from '../components/MapViewComponent';
import { NavigationBottomCard } from '../components/NavigationBottomCard';
import { NavigationSideControls } from '../components/NavigationSideControls';
import { SpeedLimitBox } from '../components/SpeedLimitBox';
import { TutorCompletionToast } from '../components/TutorCompletionToast';
import { TutorSafeCard } from '../components/TutorSafeCard';
import { DEFAULT_TUTOR_SEGMENTS } from '../data/defaultTutorSegments';
import { Coordinate, MapDisplayType, RouteInfo } from '../types/navigation';
import { TutorSegment, TutorStatus } from '../types/tutor';
import { calculateAverageSpeed, calculateRecommendedSpeed, getTutorStatus } from '../utils/tutorCalculations';
import { calculateDistanceBetweenCoordinates } from '../utils/geo';
import { calculateBearing } from '../utils/motion';
import { findTutorSegmentsOnRoute, getRouteLengthKm, getRouteProgress } from '../utils/routeProgress';
import { getContextualManeuverRouteCue } from '../utils/routeArrows';
import type { RootStackParamList } from '../types/routes';

const DEMO_SEGMENT =
  DEFAULT_TUTOR_SEGMENTS.find((segment) => segment.name === 'Tutor prova Cavin Caselle') ??
  DEFAULT_TUTOR_SEGMENTS[0];

const DEMO_START: Coordinate = { latitude: 45.4849562, longitude: 12.0346642 };
const DEMO_TUTOR_START: Coordinate = { latitude: 45.485453, longitude: 12.031735 };
const DEMO_TUTOR_END: Coordinate = { latitude: 45.488636, longitude: 12.014756 };
const DEMO_TICK_MS = 180;
const DEMO_SIM_STEP_SECONDS = 1;
// Keep the original demo pace while splitting motion into frame-sized updates.
const DEMO_TIME_SCALE = DEMO_SIM_STEP_SECONDS / (DEMO_TICK_MS / 1000);
const DEMO_MAX_FRAME_MS = 80;
const DEMO_EXPLANATION_VISIBLE_MS = 4300;

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

const formatCompactSpeed = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--';
  return `${Math.round(value)} km/h`;
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

const getDemoSpeedKmh = (
  travelledKm: number,
  tutorStartKm: number,
  tutorEndKm: number,
  recommendedSpeedKmh: number | null,
  tutorStatus: TutorStatus
): number => {
  if (travelledKm < tutorStartKm) return 42;

  const segmentLengthKm = Math.max(0.01, tutorEndKm - tutorStartKm);
  const tutorRatio = clamp((travelledKm - tutorStartKm) / segmentLengthKm, 0, 1);

  if (tutorRatio < 0.3) return 60;
  if (tutorRatio < 0.86 && tutorStatus === 'over_limit') {
    return recommendedSpeedKmh === null ? 34 : clamp(recommendedSpeedKmh, 34, 46);
  }
  if (tutorRatio < 0.86) return 43;
  if (travelledKm < tutorEndKm) return 48;
  return 38;
};

interface DemoExplanationParams {
  isTutorActive: boolean;
  isTutorCompleted: boolean;
  tutorApproachKm: number;
  tutorStatus: TutorStatus;
  averageSpeedKmh: number;
  recommendedSpeedKmh: number | null;
  finalAverageSpeedKmh: number | null;
  hasRecoveredAverage: boolean;
}

const getDemoExplanation = ({
  isTutorActive,
  isTutorCompleted,
  tutorApproachKm,
  tutorStatus,
  averageSpeedKmh,
  recommendedSpeedKmh,
  finalAverageSpeedKmh,
  hasRecoveredAverage,
}: DemoExplanationParams): { title: string; body: string } => {
  if (isTutorCompleted) {
    return {
      title: 'Tutor terminato',
      body: `Media finale: ${formatCompactSpeed(finalAverageSpeedKmh)}. Tutor Safe si disattiva e la navigazione continua normalmente.`,
    };
  }

  if (isTutorActive) {
    if (tutorStatus === 'over_limit') {
      return {
        title: 'Velocita consigliata',
        body: recommendedSpeedKmh === null
          ? 'Media troppo alta: rientro difficile. Rallenta in sicurezza e mantieni una guida regolare.'
          : `Media ${formatCompactSpeed(averageSpeedKmh)} su limite 50. Mantieni circa ${formatCompactSpeed(recommendedSpeedKmh)} fino alla fine per rientrare.`,
      };
    }

    if (hasRecoveredAverage) {
      return {
        title: 'Media rientrata',
        body: 'La media e tornata entro il limite: Tutor Safe continua a monitorare fino al punto di uscita.',
      };
    }

    return {
      title: 'Tutor Safe attivo',
      body: 'Da qui parte il calcolo della velocita media tra ingresso e uscita del tratto.',
    };
  }

  if (tutorApproachKm <= 1) {
    return {
      title: 'Preavviso Tutor',
      body: "Tra poco entrerai in un tratto controllato. Tutor Safe calcolera la media dal punto di ingresso al punto di uscita.",
    };
  }

  return {
    title: 'Navigazione demo',
    body: 'La simulazione parte poco prima del Tutor prova Cavin Caselle e mostra come cambia la media nel tratto.',
  };
};

type Props = NativeStackScreenProps<RootStackParamList, 'DemoMode'>;

export const DemoModeScreenBase: React.FC<Props> = ({ navigation }) => {
  const route = useMemo(() => getDemoRoute(), []);
  const tutorMatch = useMemo(
    () => findTutorSegmentsOnRoute(route, [DEMO_SEGMENT as TutorSegment])[0] ?? null,
    [route]
  );
  const demoTutorMatches = useMemo(() => (tutorMatch ? [tutorMatch] : []), [tutorMatch]);
  const [travelledKm, setTravelledKm] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [followUser, setFollowUser] = useState(true);
  const [mapType, setMapType] = useState<MapDisplayType>('hybrid');
  const [recenterRequestId, setRecenterRequestId] = useState(0);
  const [overlayResetKey, setOverlayResetKey] = useState(0);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [finalAverageSpeedKmh, setFinalAverageSpeedKmh] = useState<number | null>(null);
  const [explanationVisible, setExplanationVisible] = useState(true);
  const tutorEntrySecondsRef = useRef<number | null>(null);
  const tutorCompletedRef = useRef(false);
  const hasDemoOverLimitRef = useRef(false);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const explanationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const demoDynamicsRef = useRef({
    recommendedSpeedKmh: null as number | null,
    routeDistanceKm: route.distanceKm,
    tutorEndKm: 0,
    tutorStartKm: 0,
    tutorStatus: 'safe' as TutorStatus,
  });

  const tutorStartKm = tutorMatch?.startDistanceKm ?? 0.7;
  const tutorEndKm = tutorMatch?.endDistanceKm ?? Math.min(route.distanceKm, tutorStartKm + 1.3);
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
    tutorEntrySecondsRef.current === null ? 0 : Math.max(1, elapsedSeconds - tutorEntrySecondsRef.current);
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
  const currentSpeedKmh = getDemoSpeedKmh(
    travelledKm,
    tutorStartKm,
    tutorEndKm,
    recommendedSpeedKmh,
    tutorStatus
  );
  const tutorRemainingKm = Math.max(0, tutorEndKm - travelledKm);
  const tutorApproachKm = Math.max(0, tutorStartKm - travelledKm);
  const maneuverCue = getContextualManeuverRouteCue(route, progress ?? null);
  const eta = new Date(Date.now() + (progress?.durationRemainingMinutes ?? 0) * 60_000);
  const hasRecoveredAverage =
    isTutorActive &&
    hasDemoOverLimitRef.current &&
    tutorStatus !== 'over_limit' &&
    averageSpeedKmh > 0;
  const explanation = getDemoExplanation({
    isTutorActive,
    isTutorCompleted: tutorCompletedRef.current,
    tutorApproachKm,
    tutorStatus,
    averageSpeedKmh,
    recommendedSpeedKmh,
    finalAverageSpeedKmh,
    hasRecoveredAverage,
  });
  const explanationPhaseKey = `${explanation.title}-${tutorStatus}-${tutorCompletedRef.current ? 'done' : 'run'}`;

  useEffect(() => {
    demoDynamicsRef.current = {
      recommendedSpeedKmh,
      routeDistanceKm: route.distanceKm,
      tutorEndKm,
      tutorStartKm,
      tutorStatus,
    };
  }, [recommendedSpeedKmh, route.distanceKm, tutorEndKm, tutorStartKm, tutorStatus]);

  useEffect(() => {
    if (!isRunning) return undefined;

    let lastFrameAt: number | null = null;

    // requestAnimationFrame makes marker/route progress continuous; the
    // simulated clock is scaled so the scenario duration stays familiar.
    const step = (frameAt: number) => {
      if (lastFrameAt === null) {
        lastFrameAt = frameAt;
        animationFrameRef.current = requestAnimationFrame(step);
        return;
      }

      const frameMs = Math.min(DEMO_MAX_FRAME_MS, Math.max(0, frameAt - lastFrameAt));
      lastFrameAt = frameAt;
      const simulatedSeconds = (frameMs / 1000) * DEMO_TIME_SCALE;
      const dynamics = demoDynamicsRef.current;

      setElapsedSeconds((seconds) => seconds + simulatedSeconds);
      setTravelledKm((distance) => {
        const speed = getDemoSpeedKmh(
          distance,
          dynamics.tutorStartKm,
          dynamics.tutorEndKm,
          dynamics.recommendedSpeedKmh,
          dynamics.tutorStatus
        );
        return Math.min(dynamics.routeDistanceKm, distance + (speed * simulatedSeconds) / 3600);
      });

      animationFrameRef.current = requestAnimationFrame(step);
    };

    animationFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isRunning]);

  useEffect(() => {
    setExplanationVisible(true);
    if (explanationTimerRef.current) {
      clearTimeout(explanationTimerRef.current);
    }
    explanationTimerRef.current = setTimeout(
      () => setExplanationVisible(false),
      DEMO_EXPLANATION_VISIBLE_MS
    );

    return () => {
      if (explanationTimerRef.current) {
        clearTimeout(explanationTimerRef.current);
      }
    };
  }, [explanationPhaseKey]);

  useEffect(() => {
    if (isTutorActive && tutorStatus === 'over_limit') {
      hasDemoOverLimitRef.current = true;
    }
  }, [isTutorActive, tutorStatus]);

  useEffect(() => {
    if (isTutorActive && tutorEntrySecondsRef.current === null) {
      tutorEntrySecondsRef.current = elapsedSeconds;
      setCompletionMessage(null);
    }

    if (tutorMatch && travelledKm > tutorEndKm && tutorEntrySecondsRef.current !== null && !tutorCompletedRef.current) {
      tutorCompletedRef.current = true;
      setFinalAverageSpeedKmh(averageSpeedKmh);
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
      if (explanationTimerRef.current) {
        clearTimeout(explanationTimerRef.current);
      }
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const resetDemo = () => {
    tutorEntrySecondsRef.current = null;
    tutorCompletedRef.current = false;
    hasDemoOverLimitRef.current = false;
    setCompletionMessage(null);
    setFinalAverageSpeedKmh(null);
    setExplanationVisible(true);
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
        tutorMatches={demoTutorMatches}
        activeTutorSegment={isTutorActive ? DEMO_SEGMENT : null}
        destination={route.polyline[route.polyline.length - 1]}
        heading={userPose.heading}
        isNavigating
        mapType={mapType}
        maneuverCue={maneuverCue}
        overlayResetKey={overlayResetKey}
        followUserLocation={followUser}
        recenterRequestId={recenterRequestId}
        followAnimationDurationMs={0}
        followThrottleMs={32}
        onUserGesture={() => setFollowUser(false)}
      />

      <View style={styles.demoBadge}>
        <Text style={styles.demoBadgeText}>Demo Tutor Safe</Text>
        <TouchableOpacity style={styles.demoAction} onPress={resetDemo}>
          <Text style={styles.demoActionText}>Riavvia</Text>
        </TouchableOpacity>
      </View>

      {explanationVisible ? (
        <View
          style={[
            styles.explainCard,
            isTutorActive && styles.explainCardActive,
            tutorStatus === 'over_limit' && styles.explainCardAlert,
            hasRecoveredAverage && styles.explainCardRecovered,
          ]}
        >
          <Text style={styles.explainTitle}>{explanation.title}</Text>
          <Text style={styles.explainBody} numberOfLines={2}>{explanation.body}</Text>
        </View>
      ) : null}

      {isTutorActive ? (
        <TutorSafeCard
          segment={DEMO_SEGMENT}
          averageSpeedKmh={averageSpeedKmh}
          currentSpeedKmh={currentSpeedKmh}
          recommendedSpeedKmh={recommendedSpeedKmh}
          distanceRemainingKm={tutorRemainingKm}
          timeRemainingMinutes={(tutorRemainingKm / Math.max(1, currentSpeedKmh)) * 60}
          status={tutorStatus}
          distanceTravelledKm={tutorDistanceTravelledKm}
          elapsedSeconds={tutorElapsedSeconds}
          compact
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
    left: 14,
    right: 88,
    bottom: 112,
    borderRadius: 13,
    backgroundColor: 'rgba(10,18,32,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  explainCardActive: {
    borderColor: 'rgba(251,146,60,0.55)',
    backgroundColor: 'rgba(30,20,36,0.82)',
  },
  explainCardAlert: {
    borderColor: 'rgba(251,80,59,0.72)',
    backgroundColor: 'rgba(48,18,28,0.84)',
  },
  explainCardRecovered: {
    borderColor: 'rgba(34,211,238,0.55)',
    backgroundColor: 'rgba(12,36,48,0.84)',
  },
  explainTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '900',
  },
  explainBody: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
    marginTop: 3,
  },
});
