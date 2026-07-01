import { Coordinate, RouteInfo, RouteInstruction, RouteProgress } from '../types/navigation';
import { calculateDistanceBetweenCoordinates } from './geo';
import { calculateBearing } from './motion';
import {
  buildCumulativeRouteDistancesKm,
  getPolylineSectionByDistance,
} from './routeGeometry';

export interface RouteArrow {
  id: string;
  coordinate: Coordinate;
  heading: number;
}

export interface ManeuverRouteCue {
  id: string;
  section: Coordinate[];
  arrow: RouteArrow | null;
}

const IMPORTANT_MANEUVER_TYPES = [
  'turn',
  'roundabout',
  'rotary',
  'fork',
  'merge',
  'on ramp',
  'off ramp',
  'exit roundabout',
  'exit rotary',
];

const isImportantManeuver = (instruction: RouteInstruction | null | undefined): boolean => {
  if (!instruction) return false;
  const type = instruction.maneuverType?.toLowerCase().trim() || '';
  const text = instruction.text?.toLowerCase().trim() || '';
  if (!type && !text) return false;
  if (type === 'depart' || type === 'arrive' || type === 'continue' || type === 'new name') return false;

  return IMPORTANT_MANEUVER_TYPES.some((maneuverType) => type.includes(maneuverType)) ||
    /\b(svolta|gira|rotatoria|rotonda|prendi l'uscita|uscita|rampa|mantieni)\b/i.test(text);
};

const findNearestRouteIndex = (polyline: Coordinate[], target: Coordinate): number => {
  let bestIndex = 0;
  let bestDistanceKm = Number.POSITIVE_INFINITY;

  polyline.forEach((point, index) => {
    const distanceKm = calculateDistanceBetweenCoordinates(
      point.latitude,
      point.longitude,
      target.latitude,
      target.longitude
    );

    if (distanceKm < bestDistanceKm) {
      bestDistanceKm = distanceKm;
      bestIndex = index;
    }
  });

  return bestIndex;
};

export const getManeuverRouteCue = (
  route: RouteInfo | null,
  instruction: RouteInstruction | null | undefined
): ManeuverRouteCue | null => {
  if (!route || route.polyline.length < 2 || !isImportantManeuver(instruction) || !instruction?.location) {
    return null;
  }

  const maneuverIndex = findNearestRouteIndex(route.polyline, instruction.location);
  const cumulativeDistancesKm = buildCumulativeRouteDistancesKm(route.polyline);
  const maneuverDistanceKm = cumulativeDistancesKm[maneuverIndex] ?? 0;
  const isRoundabout =
    instruction.maneuverType?.toLowerCase().includes('roundabout') ||
    instruction.maneuverType?.toLowerCase().includes('rotary') ||
    /rotatoria|rotonda/i.test(instruction.text ?? '');
  const beforeKm = isRoundabout ? 0.055 : 0.04;
  const afterKm = isRoundabout ? 0.12 : 0.075;
  const section = getPolylineSectionByDistance(
    route.polyline,
    maneuverDistanceKm - beforeKm,
    maneuverDistanceKm + afterKm,
    cumulativeDistancesKm
  );

  if (section.length < 2) return null;

  const beforeArrow = section[section.length - 2];
  const arrowCoordinate = section[section.length - 1];
  const heading = calculateBearing(beforeArrow, arrowCoordinate);

  return {
    id: `maneuver-cue-${maneuverIndex}`,
    section,
    arrow: heading === null ? null : {
      id: `maneuver-arrow-${maneuverIndex}`,
      coordinate: arrowCoordinate,
      heading,
    },
  };
};

export const getContextualManeuverRouteCue = (
  route: RouteInfo | null,
  progress: RouteProgress | null,
  nextManeuverWindowKm = 0.7
): ManeuverRouteCue | null => {
  if (!route || !progress) return null;

  const currentCue = getManeuverRouteCue(route, progress.currentInstruction);
  if (currentCue) return currentCue;

  const canShowNext =
    progress.instructionDistanceRemainingKm !== null &&
    progress.instructionDistanceRemainingKm <= nextManeuverWindowKm;

  return canShowNext ? getManeuverRouteCue(route, progress.nextInstruction) : null;
};
