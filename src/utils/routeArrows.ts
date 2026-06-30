import { Coordinate, RouteInfo } from '../types/navigation';
import { calculateDistanceBetweenCoordinates } from './geo';
import { calculateBearing } from './motion';

export interface RouteArrow {
  id: string;
  coordinate: Coordinate;
  heading: number;
}

export const getRouteDirectionArrows = (route: RouteInfo | null, maxArrows = 8): RouteArrow[] => {
  if (!route || route.polyline.length < 2 || route.distanceKm <= 0) return [];

  const spacingKm = Math.max(0.45, route.distanceKm / (maxArrows + 1));
  const arrows: RouteArrow[] = [];
  let travelledKm = 0;
  let nextArrowAtKm = spacingKm;

  for (let index = 1; index < route.polyline.length && arrows.length < maxArrows; index += 1) {
    const previous = route.polyline[index - 1];
    const current = route.polyline[index];
    const segmentKm = calculateDistanceBetweenCoordinates(
      previous.latitude,
      previous.longitude,
      current.latitude,
      current.longitude
    );

    if (segmentKm <= 0) continue;

    while (travelledKm + segmentKm >= nextArrowAtKm && arrows.length < maxArrows) {
      const ratio = (nextArrowAtKm - travelledKm) / segmentKm;
      const coordinate = {
        latitude: previous.latitude + (current.latitude - previous.latitude) * ratio,
        longitude: previous.longitude + (current.longitude - previous.longitude) * ratio,
      };
      const heading = calculateBearing(previous, current);

      if (heading !== null) {
        arrows.push({
          id: `route-arrow-${index}-${arrows.length}`,
          coordinate,
          heading,
        });
      }

      nextArrowAtKm += spacingKm;
    }

    travelledKm += segmentKm;
  }

  return arrows;
};
