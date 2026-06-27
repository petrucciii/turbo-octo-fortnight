import { Place } from '../types/navigation';

export const searchPlaces = async (query: string): Promise<Place[]> => {
  try {
    // Usiamo Nominatim (OpenStreetMap) che è 100% gratuito e non richiede API Key
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TutorSafeNavigator/1.0' // Nominatim richiede un User-Agent valido
      }
    });
    
    const data = await response.json();
    
    return data.map((item: any) => ({
      id: item.place_id.toString(),
      name: item.name || item.display_name.split(',')[0],
      address: item.display_name,
      location: { 
        latitude: parseFloat(item.lat), 
        longitude: parseFloat(item.lon) 
      }
    }));
  } catch (e) {
    console.error('Error searching places with Nominatim:', e);
    return [];
  }
};

export const getPlaceDetails = async (placeId: string): Promise<Place | null> => {
  return null; // Con Nominatim abbiamo già tutti i dati nella ricerca
};
