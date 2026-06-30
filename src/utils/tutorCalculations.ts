import { TutorStatus } from '../types/tutor';

export const calculateAverageSpeed = (distanceKm: number, elapsedSeconds: number): number => {
  if (elapsedSeconds <= 0 || distanceKm <= 0) return 0;
  const elapsedHours = elapsedSeconds / 3600;
  return distanceKm / elapsedHours;
};

export const calculateRemainingDistance = (segmentLengthKm: number, distanceTravelledKm: number): number => {
  const remaining = segmentLengthKm - distanceTravelledKm;
  return remaining > 0 ? remaining : 0;
};

export const calculateRecommendedSpeed = (
  segmentLengthKm: number,
  distanceTravelledKm: number,
  elapsedSeconds: number,
  speedLimitKmh: number
): number | null => {
  if (
    !Number.isFinite(segmentLengthKm) ||
    !Number.isFinite(distanceTravelledKm) ||
    !Number.isFinite(elapsedSeconds) ||
    !Number.isFinite(speedLimitKmh) ||
    segmentLengthKm <= 0 ||
    speedLimitKmh <= 0
  ) {
    return null;
  }

  if (elapsedSeconds <= 0 || distanceTravelledKm <= 0) return speedLimitKmh;

  const elapsedHours = elapsedSeconds / 3600;
  const remainingDistanceKm = calculateRemainingDistance(segmentLengthKm, distanceTravelledKm);

  if (remainingDistanceKm <= 0) return speedLimitKmh;

  const maximumAllowedTotalTimeHours = segmentLengthKm / speedLimitKmh;
  const remainingAllowedTimeHours = maximumAllowedTotalTimeHours - elapsedHours;

  if (remainingAllowedTimeHours <= 0) return null;

  const recommendedSpeedKmh = remainingDistanceKm / remainingAllowedTimeHours;
  if (!Number.isFinite(recommendedSpeedKmh) || recommendedSpeedKmh <= 0) return null;

  return recommendedSpeedKmh > speedLimitKmh ? speedLimitKmh : recommendedSpeedKmh;
};

export const getTutorStatus = (averageSpeedKmh: number, speedLimitKmh: number): TutorStatus => {
  if (averageSpeedKmh <= 0) return 'safe';
  if (averageSpeedKmh > speedLimitKmh) {
    return 'over_limit';
  }
  if (averageSpeedKmh > speedLimitKmh - 5) {
    return 'warning';
  }
  return 'safe';
};
