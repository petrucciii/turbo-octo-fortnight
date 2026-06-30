import { Coordinate } from '../types/navigation';

const getScale = (latitude: number) => ({
  lat: 111_320,
  lon: 111_320 * Math.cos((latitude * Math.PI) / 180),
});

export const distancePointToSegmentMeters = (
  point: Coordinate,
  segmentStart: Coordinate,
  segmentEnd: Coordinate
): number => {
  const referenceLatitude = (point.latitude + segmentStart.latitude + segmentEnd.latitude) / 3;
  const scale = getScale(referenceLatitude);

  const startX = segmentStart.longitude * scale.lon;
  const startY = segmentStart.latitude * scale.lat;
  const endX = segmentEnd.longitude * scale.lon;
  const endY = segmentEnd.latitude * scale.lat;
  const pointX = point.longitude * scale.lon;
  const pointY = point.latitude * scale.lat;

  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  const rawT =
    lengthSquared === 0
      ? 0
      : ((pointX - startX) * deltaX + (pointY - startY) * deltaY) / lengthSquared;
  const t = Math.max(0, Math.min(1, rawT));
  const projectedX = startX + t * deltaX;
  const projectedY = startY + t * deltaY;

  return Math.sqrt(
    (pointX - projectedX) * (pointX - projectedX) +
      (pointY - projectedY) * (pointY - projectedY)
  );
};
