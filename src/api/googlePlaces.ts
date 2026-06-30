import { Coordinate, Place } from '../types/navigation';
import { calculateDistanceBetweenCoordinates } from '../utils/geo';

const ITALY_VIEWBOX = '6.0,47.5,19.0,35.0';

const getLocalViewbox = (coordinate: Coordinate): string => {
  const latDelta = 1.8;
  const lonDelta = 2.4;
  const left = coordinate.longitude - lonDelta;
  const right = coordinate.longitude + lonDelta;
  const top = coordinate.latitude + latDelta;
  const bottom = coordinate.latitude - latDelta;
  return `${left},${top},${right},${bottom}`;
};

const isValidCoordinate = (latitude: number, longitude: number): boolean => {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
};

const getDistanceScore = (place: Place, userLocation: Coordinate | null): number => {
  if (!userLocation) return Number.POSITIVE_INFINITY;
  return calculateDistanceBetweenCoordinates(
    userLocation.latitude,
    userLocation.longitude,
    place.location.latitude,
    place.location.longitude
  );
};

export const searchPlaces = async (
  query: string,
  userLocation: Coordinate | null = null
): Promise<Place[]> => {
  try {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 3) return [];

    const params = new URLSearchParams({
      q: trimmedQuery,
      format: 'json',
      addressdetails: '1',
      limit: '12',
      countrycodes: 'it',
      'accept-language': 'it',
      viewbox: userLocation ? getLocalViewbox(userLocation) : ITALY_VIEWBOX,
      bounded: '0',
    });
    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'it',
        'User-Agent': 'TutorSafePrototype/1.0',
      },
    });

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    const places = data
      .map((item: any) => {
        const latitude = parseFloat(item.lat);
        const longitude = parseFloat(item.lon);
        if (!isValidCoordinate(latitude, longitude)) return null;

        const displayName = typeof item.display_name === 'string' ? item.display_name : 'Risultato senza nome';
        return {
          id: item.place_id?.toString() ?? `${latitude}-${longitude}`,
          name: item.name || displayName.split(',')[0] || 'Luogo senza nome',
          address: displayName,
          location: { latitude, longitude },
        } satisfies Place;
      })
      .filter((place: Place | null): place is Place => place !== null);

    const uniquePlaces = places.filter((place, index, array) => {
      return array.findIndex((candidate) => candidate.id === place.id) === index;
    });

    return uniquePlaces.sort((a, b) => {
      const distanceA = getDistanceScore(a, userLocation);
      const distanceB = getDistanceScore(b, userLocation);
      if (Number.isFinite(distanceA) && Number.isFinite(distanceB) && Math.abs(distanceA - distanceB) > 0.2) {
        return distanceA - distanceB;
      }

      return a.name.localeCompare(b.name, 'it');
    });
  } catch (e) {
    console.error('Error searching places with Nominatim:', e);
    return [];
  }
};

export const getPlaceDetails = async (): Promise<Place | null> => {
  return null;
};
