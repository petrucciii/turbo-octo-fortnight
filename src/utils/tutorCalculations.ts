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
  if (elapsedSeconds <= 0 || distanceTravelledKm <= 0) return speedLimitKmh;
  
  const elapsedHours = elapsedSeconds / 3600;
  const remainingDistanceKm = calculateRemainingDistance(segmentLengthKm, distanceTravelledKm);
  
  if (remainingDistanceKm <= 0) return speedLimitKmh;

  const minimumTotalTimeHours = segmentLengthKm / speedLimitKmh;
  const remainingMinimumTimeHours = minimumTotalTimeHours - elapsedHours;

  if (remainingMinimumTimeHours <= 0) {
    // Non è più possibile rientrare nella media
    return null; 
  }

  const recommendedSpeedKmh = remainingDistanceKm / remainingMinimumTimeHours;
  
  // Regola di sicurezza: non consigliare mai una velocità superiore al limite
  return recommendedSpeedKmh > speedLimitKmh ? speedLimitKmh : recommendedSpeedKmh;
};

export const getTutorStatus = (averageSpeedKmh: number, speedLimitKmh: number): TutorStatus => {
  if (averageSpeedKmh <= 0) return 'safe';
  if (averageSpeedKmh > speedLimitKmh) {
    return 'over_limit';
  } else if (averageSpeedKmh > speedLimitKmh - 5) {
    return 'warning';
  } else {
    return 'safe';
  }
};
