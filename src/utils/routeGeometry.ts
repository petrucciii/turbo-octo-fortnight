import { Coordinate } from '../types/navigation';
import type { RouteTutorMatch } from './routeProgress';
import { calculateDistanceBetweenCoordinates } from './geo';

export interface RouteRenderSection {
  id: string;
  coordinates: Coordinate[];
  type: 'route' | 'tutor';
  tutorId?: string;
}

const areSameCoordinate = (a: Coordinate, b: Coordinate): boolean => {
  return Math.abs(a.latitude - b.latitude) < 0.000001 && Math.abs(a.longitude - b.longitude) < 0.000001;
};

export const buildCumulativeRouteDistancesKm = (polyline: Coordinate[]): number[] => {
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

export const getCoordinateAtRouteDistance = (
  polyline: Coordinate[],
  targetDistanceKm: number,
  cumulativeDistancesKm = buildCumulativeRouteDistancesKm(polyline)
): Coordinate | null => {
  if (polyline.length === 0) return null;
  if (polyline.length === 1 || targetDistanceKm <= 0) return polyline[0];

  const routeLengthKm = cumulativeDistancesKm[cumulativeDistancesKm.length - 1] ?? 0;
  if (targetDistanceKm >= routeLengthKm) return polyline[polyline.length - 1];

  for (let index = 1; index < polyline.length; index += 1) {
    const previousDistanceKm = cumulativeDistancesKm[index - 1] ?? 0;
    const currentDistanceKm = cumulativeDistancesKm[index] ?? previousDistanceKm;

    if (targetDistanceKm <= currentDistanceKm) {
      const previous = polyline[index - 1];
      const current = polyline[index];
      const segmentDistanceKm = currentDistanceKm - previousDistanceKm;
      const ratio = segmentDistanceKm > 0
        ? (targetDistanceKm - previousDistanceKm) / segmentDistanceKm
        : 0;

      return {
        latitude: previous.latitude + (current.latitude - previous.latitude) * ratio,
        longitude: previous.longitude + (current.longitude - previous.longitude) * ratio,
      };
    }
  }

  return polyline[polyline.length - 1];
};

export const getPolylineSectionByDistance = (
  polyline: Coordinate[],
  startDistanceKm: number,
  endDistanceKm: number,
  cumulativeDistancesKm = buildCumulativeRouteDistancesKm(polyline)
): Coordinate[] => {
  if (polyline.length < 2) return [];

  const routeLengthKm = cumulativeDistancesKm[cumulativeDistancesKm.length - 1] ?? 0;
  const startKm = Math.max(0, Math.min(routeLengthKm, startDistanceKm));
  const endKm = Math.max(startKm, Math.min(routeLengthKm, endDistanceKm));

  if (endKm - startKm <= 0.001) return [];

  const start = getCoordinateAtRouteDistance(polyline, startKm, cumulativeDistancesKm);
  const end = getCoordinateAtRouteDistance(polyline, endKm, cumulativeDistancesKm);
  if (!start || !end) return [];

  const section: Coordinate[] = [start];
  for (let index = 1; index < polyline.length - 1; index += 1) {
    const distanceKm = cumulativeDistancesKm[index] ?? 0;
    if (distanceKm > startKm && distanceKm < endKm) {
      const point = polyline[index];
      if (!areSameCoordinate(section[section.length - 1], point)) {
        section.push(point);
      }
    }
  }

  if (!areSameCoordinate(section[section.length - 1], end)) {
    section.push(end);
  }

  return section.length >= 2 ? section : [];
};

export const splitRouteByTutorMatches = (
  polyline: Coordinate[],
  tutorMatches: RouteTutorMatch[]
): RouteRenderSection[] => {
  if (polyline.length < 2) return [];

  const cumulativeDistancesKm = buildCumulativeRouteDistancesKm(polyline);
  const routeLengthKm = cumulativeDistancesKm[cumulativeDistancesKm.length - 1] ?? 0;
  const sortedMatches = [...tutorMatches]
    .filter((match) => match.endDistanceKm > match.startDistanceKm)
    .sort((a, b) => a.startDistanceKm - b.startDistanceKm);

  if (sortedMatches.length === 0) {
    return [{ id: 'route-full', coordinates: polyline, type: 'route' }];
  }

  const sections: RouteRenderSection[] = [];
  let cursorKm = 0;

  sortedMatches.forEach((match) => {
    const startKm = Math.max(cursorKm, Math.min(routeLengthKm, match.startDistanceKm));
    const endKm = Math.max(startKm, Math.min(routeLengthKm, match.endDistanceKm));

    const before = getPolylineSectionByDistance(polyline, cursorKm, startKm, cumulativeDistancesKm);
    if (before.length >= 2) {
      sections.push({
        id: `route-before-${match.segment.id}-${sections.length}`,
        coordinates: before,
        type: 'route',
      });
    }

    const tutorSection = getPolylineSectionByDistance(polyline, startKm, endKm, cumulativeDistancesKm);
    if (tutorSection.length >= 2) {
      sections.push({
        id: `route-tutor-${match.segment.id}`,
        coordinates: tutorSection,
        type: 'tutor',
        tutorId: match.segment.id,
      });
    }

    cursorKm = Math.max(cursorKm, endKm);
  });

  const after = getPolylineSectionByDistance(polyline, cursorKm, routeLengthKm, cumulativeDistancesKm);
  if (after.length >= 2) {
    sections.push({
      id: `route-after-${sections.length}`,
      coordinates: after,
      type: 'route',
    });
  }

  return sections.length > 0 ? sections : [{ id: 'route-full', coordinates: polyline, type: 'route' }];
};
