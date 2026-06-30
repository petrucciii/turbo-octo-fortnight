import { Coordinate, RouteInfo, RouteInstruction, RouteProgress } from '../types/navigation';
import { calculateDistanceBetweenCoordinates } from './geo';
import { calculateBearing } from './motion';

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

const trimSectionByDistance = (section: Coordinate[], maxDistanceKm = 0.28): Coordinate[] => {
  if (section.length <= 2) return section;

  const trimmed = [section[0]];
  let travelledKm = 0;

  for (let index = 1; index < section.length; index += 1) {
    const previous = section[index - 1];
    const current = section[index];
    const segmentKm = calculateDistanceBetweenCoordinates(
      previous.latitude,
      previous.longitude,
      current.latitude,
      current.longitude
    );

    travelledKm += segmentKm;
    trimmed.push(current);
    if (travelledKm >= maxDistanceKm) break;
  }

  return trimmed;
};

export const getManeuverRouteCue = (
  route: RouteInfo | null,
  instruction: RouteInstruction | null | undefined
): ManeuverRouteCue | null => {
  if (!route || route.polyline.length < 2 || !isImportantManeuver(instruction) || !instruction?.location) {
    return null;
  }

  const maneuverIndex = findNearestRouteIndex(route.polyline, instruction.location);
  const startIndex = Math.max(0, maneuverIndex - 2);
  const endIndex = Math.min(route.polyline.length - 1, maneuverIndex + 4);
  const section = trimSectionByDistance(route.polyline.slice(startIndex, endIndex + 1));

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
