import { Coordinate } from '../types/navigation';
import { calculateDistanceBetweenCoordinates } from './geo';

const EARTH_RADIUS_METERS = 6_371_000;

export const normalizeHeading = (heading: number): number => {
  return ((heading % 360) + 360) % 360;
};

export const calculateBearing = (from: Coordinate, to: Coordinate): number | null => {
  if (from.latitude === to.latitude && from.longitude === to.longitude) return null;

  const startLat = (from.latitude * Math.PI) / 180;
  const endLat = (to.latitude * Math.PI) / 180;
  const deltaLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const y = Math.sin(deltaLon) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(deltaLon);

  return normalizeHeading((Math.atan2(y, x) * 180) / Math.PI);
};

export const smoothHeading = (
  previousHeading: number | null,
  nextHeading: number | null,
  smoothing = 0.28
): number | null => {
  if (nextHeading === null || Number.isNaN(nextHeading)) return previousHeading;
  if (previousHeading === null || Number.isNaN(previousHeading)) return normalizeHeading(nextHeading);

  const normalizedPrevious = normalizeHeading(previousHeading);
  const normalizedNext = normalizeHeading(nextHeading);
  const shortestDelta = ((normalizedNext - normalizedPrevious + 540) % 360) - 180;

  return normalizeHeading(normalizedPrevious + shortestDelta * smoothing);
};

export const getFallbackSpeedKmh = (
  previousLocation: { coordinate: Coordinate; timestamp: number } | null,
  coordinate: Coordinate,
  timestamp: number
): number | null => {
  if (!previousLocation || timestamp <= previousLocation.timestamp) return null;

  const distanceKm = calculateDistanceBetweenCoordinates(
    previousLocation.coordinate.latitude,
    previousLocation.coordinate.longitude,
    coordinate.latitude,
    coordinate.longitude
  );
  const elapsedHours = (timestamp - previousLocation.timestamp) / 3_600_000;
  if (elapsedHours <= 0) return null;

  const speedKmh = distanceKm / elapsedHours;
  if (!Number.isFinite(speedKmh) || speedKmh < 0 || speedKmh > 260) return null;

  return speedKmh;
};

export const sanitizeSpeedKmh = (speedKmh: number | null | undefined): number | null => {
  if (speedKmh === null || speedKmh === undefined || Number.isNaN(speedKmh)) return null;
  if (!Number.isFinite(speedKmh) || speedKmh < 2 || speedKmh > 220) return null;
  return speedKmh;
};

export const smoothSpeedKmh = (
  previousSpeedKmh: number | null,
  nextSpeedKmh: number | null,
  smoothing = 0.35
): number | null => {
  const sanitizedNext = sanitizeSpeedKmh(nextSpeedKmh);
  if (sanitizedNext === null) return null;
  if (previousSpeedKmh === null || Number.isNaN(previousSpeedKmh)) return sanitizedNext;

  return previousSpeedKmh + (sanitizedNext - previousSpeedKmh) * smoothing;
};

export const projectCoordinate = (
  coordinate: Coordinate,
  bearingDegrees: number,
  distanceMeters: number
): Coordinate => {
  const bearing = (normalizeHeading(bearingDegrees) * Math.PI) / 180;
  const distanceRatio = distanceMeters / EARTH_RADIUS_METERS;
  const lat1 = (coordinate.latitude * Math.PI) / 180;
  const lon1 = (coordinate.longitude * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceRatio) +
      Math.cos(lat1) * Math.sin(distanceRatio) * Math.cos(bearing)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(distanceRatio) * Math.cos(lat1),
      Math.cos(distanceRatio) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    latitude: (lat2 * 180) / Math.PI,
    longitude: (lon2 * 180) / Math.PI,
  };
};
