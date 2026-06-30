import { Place } from '../types/navigation';

export const searchPlaces = async (query: string): Promise<Place[]> => {
  try {
    // Nominatim (OpenStreetMap) e' gratuito e non richiede API key.
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=8`;

    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'it',
      },
    });

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      id: item.place_id.toString(),
      name: item.name || item.display_name.split(',')[0],
      address: item.display_name,
      location: {
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      },
    }));
  } catch (e) {
    console.error('Error searching places with Nominatim:', e);
    return [];
  }
};

export const getPlaceDetails = async (): Promise<Place | null> => {
  return null;
};
