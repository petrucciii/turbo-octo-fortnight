// Formula Haversine
export const calculateDistanceBetweenCoordinates = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Raggio della Terra in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance; // Ritorna distanza in km
};

export const isNearPoint = (
  userLat: number,
  userLon: number,
  pointLat: number,
  pointLon: number,
  radiusMeters: number
): boolean => {
  const distanceKm = calculateDistanceBetweenCoordinates(userLat, userLon, pointLat, pointLon);
  return distanceKm * 1000 <= radiusMeters;
};
