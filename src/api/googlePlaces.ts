import { Coordinate, Place } from '../types/navigation';
import { calculateDistanceBetweenCoordinates } from '../utils/geo';

const ITALY_VIEWBOX = '6.0,47.5,19.0,35.0';
const LOCAL_RESULT_RADIUS_KM = 150;
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const RATE_LIMIT_COOLDOWN_MS = 60_000;
const MIN_NOMINATIM_INTERVAL_MS = 1200;

type CachedSearch = {
  timestamp: number;
  results: Place[];
};

const searchCache = new Map<string, CachedSearch>();
let nominatimBlockedUntil = 0;
let lastNominatimRequestAt = 0;
let requestThrottleQueue: Promise<void> = Promise.resolve();

export class NominatimRateLimitError extends Error {
  constructor() {
    super('NOMINATIM_RATE_LIMITED');
    this.name = 'NominatimRateLimitError';
  }
}

export class NominatimNetworkError extends Error {
  constructor(message = 'NOMINATIM_NETWORK_ERROR') {
    super(message);
    this.name = 'NominatimNetworkError';
  }
}

export class NominatimInvalidResponseError extends Error {
  constructor() {
    super('NOMINATIM_INVALID_RESPONSE');
    this.name = 'NominatimInvalidResponseError';
  }
}

export const isNominatimRateLimitError = (error: unknown): error is NominatimRateLimitError => {
  return error instanceof NominatimRateLimitError || (error as Error | undefined)?.name === 'NominatimRateLimitError';
};

export const isNominatimNetworkError = (error: unknown): error is NominatimNetworkError => {
  return error instanceof NominatimNetworkError || (error as Error | undefined)?.name === 'NominatimNetworkError';
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const isNominatimBlocked = (): boolean => Date.now() < nominatimBlockedUntil;

const normalizeQuery = (query: string): string => query.trim().toLowerCase().replace(/\s+/g, ' ');

const getRoundedCoordinate = (coordinate: Coordinate | null): string => {
  if (!coordinate) return 'no-location';
  return `${coordinate.latitude.toFixed(2)},${coordinate.longitude.toFixed(2)}`;
};

const getCacheKey = (query: string, userLocation: Coordinate | null): string => {
  return `${normalizeQuery(query)}-${getRoundedCoordinate(userLocation)}`;
};

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

const waitForNominatimSlot = async (): Promise<void> => {
  requestThrottleQueue = requestThrottleQueue.then(async () => {
    const now = Date.now();
    const elapsed = now - lastNominatimRequestAt;

    if (elapsed < MIN_NOMINATIM_INTERVAL_MS) {
      await delay(MIN_NOMINATIM_INTERVAL_MS - elapsed);
    }

    lastNominatimRequestAt = Date.now();
  });

  await requestThrottleQueue;
};

const fetchNominatim = async (
  query: string,
  viewbox: string,
  bounded: boolean,
  limit = 12
): Promise<any[]> => {
  if (isNominatimBlocked()) {
    throw new NominatimRateLimitError();
  }

  await waitForNominatimSlot();
  if (isNominatimBlocked()) {
    throw new NominatimRateLimitError();
  }

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

  let response: Response;
  try {
    response = await fetch(url, { headers: getFetchHeaders() });
  } catch (error) {
    throw new NominatimNetworkError(error instanceof Error ? error.message : undefined);
  }

  if (response.status === 429) {
    nominatimBlockedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
    throw new NominatimRateLimitError();
  }

  if (!response.ok) {
    throw new NominatimNetworkError(`NOMINATIM_HTTP_${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) throw new NominatimInvalidResponseError();

  return data;
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

const buildPlaces = (items: any[], userLocation: Coordinate | null): Place[] => {
  return items
    .map((item) => toPlace(item, userLocation))
    .filter((place: Place | null): place is Place => place !== null);
};

const prioritizeNearbyResults = (places: Place[], userLocation: Coordinate | null): Place[] => {
  const sortedPlaces = sortByDistanceThenName(uniqueByIdOrLocation(places));
  if (!userLocation) return sortedPlaces;

  const nearbyPlaces = sortedPlaces.filter((place) => {
    return typeof place.distanceKm === 'number' && place.distanceKm <= LOCAL_RESULT_RADIUS_KM;
  });

  return nearbyPlaces.length > 0 ? nearbyPlaces : sortedPlaces;
};

export const searchPlaces = async (
  query: string,
  userLocation: Coordinate | null = null
): Promise<Place[]> => {
  const normalizedQuery = normalizeQuery(query);
  if (normalizedQuery.length < 3) return [];

  const cacheKey = getCacheKey(normalizedQuery, userLocation);
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL_MS) {
    return cached.results;
  }

  let places: Place[] = [];

  if (userLocation) {
    const localItems = await fetchNominatim(normalizedQuery, getLocalViewbox(userLocation), true, 12);
    places = buildPlaces(localItems, userLocation);
  }

  const shouldFallbackToItaly = places.length === 0;
  if (shouldFallbackToItaly) {
    const fallbackItems = await fetchNominatim(normalizedQuery, ITALY_VIEWBOX, true, 12);
    places = [...places, ...buildPlaces(fallbackItems, userLocation)];
  }

  const results = prioritizeNearbyResults(places, userLocation);
  searchCache.set(cacheKey, { timestamp: Date.now(), results });
  return results;
};

export const getPlaceDetails = async (): Promise<Place | null> => {
  return null;
};
