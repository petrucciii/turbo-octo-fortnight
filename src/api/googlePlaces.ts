import { Coordinate, Place } from '../types/navigation';
import { calculateDistanceBetweenCoordinates } from '../utils/geo';

const ITALY_VIEWBOX = '6.0,47.5,19.0,35.0';
const LOCAL_RESULT_RADIUS_KM = 150;

const getLocalViewbox = (coordinate: Coordinate): string => {
  const latDelta = 1.35;
  const lonDelta = 1.8;
  const left = coordinate.longitude - lonDelta;
  const right = coordinate.longitude + lonDelta;
  const top = coordinate.latitude + latDelta;
  const bottom = coordinate.latitude - latDelta;
  return `${left},${top},${right},${bottom}`;
};

const isValidCoordinate = (latitude: number, longitude: number): boolean => {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
};

const getDistanceKm = (place: Place, userLocation: Coordinate | null): number | undefined => {
  if (!userLocation) return undefined;
  return calculateDistanceBetweenCoordinates(
    userLocation.latitude,
    userLocation.longitude,
    place.location.latitude,
    place.location.longitude
  );
};

const isItalianResult = (item: any): boolean => {
  const countryCode = item?.address?.country_code;
  if (typeof countryCode === 'string') return countryCode.toLowerCase() === 'it';

  const displayName = typeof item?.display_name === 'string' ? item.display_name.toLowerCase() : '';
  return displayName.includes('italia') || displayName.includes('italy');
};

const toPlace = (item: any, userLocation: Coordinate | null): Place | null => {
  const latitude = parseFloat(item.lat);
  const longitude = parseFloat(item.lon);
  if (!isValidCoordinate(latitude, longitude) || !isItalianResult(item)) return null;

  const displayName = typeof item.display_name === 'string' ? item.display_name : 'Risultato senza nome';
  const place: Place = {
    id: item.place_id?.toString() ?? `${latitude}-${longitude}`,
    name: item.name || displayName.split(',')[0] || 'Luogo senza nome',
    address: displayName,
    location: { latitude, longitude },
  };

  const distanceKm = getDistanceKm(place, userLocation);
  return distanceKm === undefined ? place : { ...place, distanceKm };
};

const getFetchHeaders = (): HeadersInit => {
  const headers: Record<string, string> = {
    'Accept-Language': 'it',
  };

  if (typeof document === 'undefined') {
    headers['User-Agent'] = 'TutorSafePrototype/1.0';
  }

  return headers;
};

const fetchNominatim = async (
  query: string,
  viewbox: string,
  bounded: boolean,
  limit = 12
): Promise<any[]> => {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: limit.toString(),
    countrycodes: 'it',
    'accept-language': 'it',
    viewbox,
    bounded: bounded ? '1' : '0',
  });
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  const response = await fetch(url, { headers: getFetchHeaders() });

  if (!response.ok) {
    console.warn('Nominatim search failed:', response.status, response.statusText);
    return [];
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

const uniqueByIdOrLocation = (places: Place[]): Place[] => {
  const seen = new Set<string>();
  return places.filter((place) => {
    const key = `${place.name.toLowerCase()}-${place.location.latitude.toFixed(4)}-${place.location.longitude.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const sortByDistanceThenName = (places: Place[]): Place[] => {
  return [...places].sort((a, b) => {
    const distanceA = a.distanceKm ?? Number.POSITIVE_INFINITY;
    const distanceB = b.distanceKm ?? Number.POSITIVE_INFINITY;

    if (Number.isFinite(distanceA) && Number.isFinite(distanceB) && Math.abs(distanceA - distanceB) > 0.2) {
      return distanceA - distanceB;
    }

    return a.name.localeCompare(b.name, 'it');
  });
};

export const searchPlaces = async (
  query: string,
  userLocation: Coordinate | null = null
): Promise<Place[]> => {
  try {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 3) return [];

    const localItems = userLocation
      ? await fetchNominatim(trimmedQuery, getLocalViewbox(userLocation), true, 12)
      : [];
    const localPlaces = localItems
      .map((item) => toPlace(item, userLocation))
      .filter((place: Place | null): place is Place => place !== null);

    const needsItalyFallback = localPlaces.length < 4;
    const fallbackItems = needsItalyFallback
      ? await fetchNominatim(trimmedQuery, ITALY_VIEWBOX, true, 12)
      : [];
    const fallbackPlaces = fallbackItems
      .map((item) => toPlace(item, userLocation))
      .filter((place: Place | null): place is Place => place !== null);

    const sortedPlaces = sortByDistanceThenName(uniqueByIdOrLocation([...localPlaces, ...fallbackPlaces]));
    if (!userLocation) return sortedPlaces;

    const nearbyPlaces = sortedPlaces.filter((place) => {
      return typeof place.distanceKm === 'number' && place.distanceKm <= LOCAL_RESULT_RADIUS_KM;
    });

    return nearbyPlaces.length > 0 ? nearbyPlaces : sortedPlaces;
  } catch (e) {
    console.error('Error searching places with Nominatim:', e);
    return [];
  }
};

export const getPlaceDetails = async (): Promise<Place | null> => {
  return null;
};
