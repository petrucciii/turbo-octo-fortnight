import { Coordinate, RouteInfo, RouteInstruction, RouteProgress } from '../types/navigation';
import { TutorSegment } from '../types/tutor';
import { calculateDistanceBetweenCoordinates } from './geo';

const DEFAULT_OFF_ROUTE_THRESHOLD_METERS = 120;
const ROUTE_TUTOR_MATCH_RADIUS_METERS = 900;

export interface RouteTutorMatch {
  segment: TutorSegment;
  startDistanceKm: number;
  endDistanceKm: number;
}

interface NearestPointOnRoute {
  nearestPoint: Coordinate;
  segmentIndex: number;
  distanceMeters: number;
  distanceFromStartKm: number;
}

const getScale = (latitude: number) => ({
  lat: 111_320,
  lon: 111_320 * Math.cos((latitude * Math.PI) / 180),
});

const getInstructionAtDistance = (
  instructions: RouteInstruction[],
  distanceTravelledKm: number
): { current: RouteInstruction | null; next: RouteInstruction | null } => {
  if (instructions.length === 0) {
    return { current: null, next: null };
  }

  let accumulatedKm = 0;

  for (let index = 0; index < instructions.length; index += 1) {
    const instruction = instructions[index];
    const stepDistanceKm = Math.max(instruction.distanceKm, 0);

    if (distanceTravelledKm <= accumulatedKm + stepDistanceKm + 0.03) {
      return {
        current: instruction,
        next: instructions[index + 1] ?? null,
      };
    }

    accumulatedKm += stepDistanceKm;
  }

  return {
    current: instructions[instructions.length - 1],
    next: null,
  };
};

export const getRouteLengthKm = (polyline: Coordinate[]): number => {
  if (polyline.length < 2) return 0;

  let totalKm = 0;
  for (let index = 1; index < polyline.length; index += 1) {
    totalKm += calculateDistanceBetweenCoordinates(
      polyline[index - 1].latitude,
      polyline[index - 1].longitude,
      polyline[index].latitude,
      polyline[index].longitude
    );
  }

  return totalKm;
};

const buildCumulativeDistancesKm = (polyline: Coordinate[]): number[] => {
  const cumulative = [0];

  for (let index = 1; index < polyline.length; index += 1) {
    const previous = polyline[index - 1];
    const current = polyline[index];
    cumulative[index] =
      cumulative[index - 1] +
      calculateDistanceBetweenCoordinates(
        previous.latitude,
        previous.longitude,
        current.latitude,
        current.longitude
      );
  }

  return cumulative;
};

export const findNearestPointOnRoute = (
  coordinate: Coordinate,
  route: RouteInfo
): NearestPointOnRoute | null => {
  const { polyline } = route;
  if (polyline.length === 0) return null;
  if (polyline.length === 1) {
    return {
      nearestPoint: polyline[0],
      segmentIndex: 0,
      distanceMeters:
        calculateDistanceBetweenCoordinates(
          coordinate.latitude,
          coordinate.longitude,
          polyline[0].latitude,
          polyline[0].longitude
        ) * 1000,
      distanceFromStartKm: 0,
    };
  }

  const cumulativeDistancesKm = buildCumulativeDistancesKm(polyline);
  let best: NearestPointOnRoute | null = null;

  for (let index = 0; index < polyline.length - 1; index += 1) {
    const start = polyline[index];
    const end = polyline[index + 1];
    const referenceLatitude = (start.latitude + end.latitude + coordinate.latitude) / 3;
    const scale = getScale(referenceLatitude);

    const startX = start.longitude * scale.lon;
    const startY = start.latitude * scale.lat;
    const endX = end.longitude * scale.lon;
    const endY = end.latitude * scale.lat;
    const pointX = coordinate.longitude * scale.lon;
    const pointY = coordinate.latitude * scale.lat;

    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const segmentLengthSquared = deltaX * deltaX + deltaY * deltaY;
    const rawT =
      segmentLengthSquared === 0
        ? 0
        : ((pointX - startX) * deltaX + (pointY - startY) * deltaY) / segmentLengthSquared;
    const t = Math.min(1, Math.max(0, rawT));

    const projectedX = startX + t * deltaX;
    const projectedY = startY + t * deltaY;
    const distanceMeters = Math.sqrt(
      (pointX - projectedX) * (pointX - projectedX) +
        (pointY - projectedY) * (pointY - projectedY)
    );
    const nearestPoint = {
      latitude: projectedY / scale.lat,
      longitude: projectedX / scale.lon,
    };
    const partialDistanceKm =
      calculateDistanceBetweenCoordinates(
        start.latitude,
        start.longitude,
        nearestPoint.latitude,
        nearestPoint.longitude
      );

    const candidate: NearestPointOnRoute = {
      nearestPoint,
      segmentIndex: index,
      distanceMeters,
      distanceFromStartKm: cumulativeDistancesKm[index] + partialDistanceKm,
    };

    if (!best || candidate.distanceMeters < best.distanceMeters) {
      best = candidate;
    }
  }

  return best;
};

export const getRouteProgress = (
  route: RouteInfo,
  coordinate: Coordinate,
  offRouteThresholdMeters = DEFAULT_OFF_ROUTE_THRESHOLD_METERS
): RouteProgress | null => {
  const nearest = findNearestPointOnRoute(coordinate, route);
  if (!nearest) return null;

  const routeLengthKm = route.distanceKm || getRouteLengthKm(route.polyline);
  const distanceTravelledKm = Math.min(routeLengthKm, Math.max(0, nearest.distanceFromStartKm));
  const distanceRemainingKm = Math.max(0, routeLengthKm - distanceTravelledKm);
  const durationRemainingMinutes =
    routeLengthKm > 0
      ? Math.max(0, route.durationMinutes * (distanceRemainingKm / routeLengthKm))
      : 0;
  const { current, next } = getInstructionAtDistance(route.instructions, distanceTravelledKm);

  return {
    nearestPoint: nearest.nearestPoint,
    nearestSegmentIndex: nearest.segmentIndex,
    distanceFromRouteMeters: nearest.distanceMeters,
    distanceTravelledKm,
    distanceRemainingKm,
    durationRemainingMinutes,
    currentInstruction: current,
    nextInstruction: next,
    currentRoadName: current?.streetName || null,
    isOffRoute: nearest.distanceMeters > offRouteThresholdMeters,
  };
};

export const getDistanceAlongRouteToCoordinate = (
  route: RouteInfo,
  coordinate: Coordinate
): number | null => {
  return findNearestPointOnRoute(coordinate, route)?.distanceFromStartKm ?? null;
};

export const findTutorSegmentsOnRoute = (
  route: RouteInfo,
  segments: TutorSegment[]
): RouteTutorMatch[] => {
  const matches = segments
    .map((segment) => {
      const startCoordinate = {
        latitude: segment.start_latitude,
        longitude: segment.start_longitude,
      };
      const endCoordinate = {
        latitude: segment.end_latitude,
        longitude: segment.end_longitude,
      };
      const startNearest = findNearestPointOnRoute(startCoordinate, route);
      const endNearest = findNearestPointOnRoute(endCoordinate, route);

      if (!startNearest || !endNearest) return null;

      const startRadius = Math.max(segment.start_radius_meters, ROUTE_TUTOR_MATCH_RADIUS_METERS);
      const endRadius = Math.max(segment.end_radius_meters, ROUTE_TUTOR_MATCH_RADIUS_METERS);
      const isOnRoute =
        startNearest.distanceMeters <= startRadius &&
        endNearest.distanceMeters <= endRadius &&
        endNearest.distanceFromStartKm > startNearest.distanceFromStartKm;

      if (!isOnRoute) return null;

      return {
        segment,
        startDistanceKm: startNearest.distanceFromStartKm,
        endDistanceKm: endNearest.distanceFromStartKm,
      };
    })
    .filter((match): match is RouteTutorMatch => Boolean(match));

  return matches.sort((a, b) => a.startDistanceKm - b.startDistanceKm);
};

export const getUpcomingTutorMatch = (
  matches: RouteTutorMatch[],
  distanceTravelledKm: number,
  maxDistanceKm = 1
): RouteTutorMatch | null => {
  return (
    matches.find((match) => {
      const distanceToStartKm = match.startDistanceKm - distanceTravelledKm;
      return distanceToStartKm >= 0 && distanceToStartKm <= maxDistanceKm;
    }) ?? null
  );
};
