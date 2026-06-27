import { Coordinate, RouteInfo, RoutePoint } from '../types/navigation';

export const getDirections = async (origin: Coordinate, destination: Coordinate): Promise<RouteInfo | null> => {
  try {
    // Usiamo OSRM (Open Source Routing Machine) che è un server pubblico gratuito
    // OSRM richiede le coordinate nel formato: lon,lat
    const url = `http://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&steps=true`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.warn('OSRM returned status:', data.code);
      return null;
    }

    const route = data.routes[0];
    
    // Mappiamo le coordinate GeoJSON [lon, lat] nel formato {latitude, longitude}
    const polyline: RoutePoint[] = route.geometry.coordinates.map((coord: number[]) => ({
      latitude: coord[1],
      longitude: coord[0]
    }));

    const instructions = route.legs[0].steps.map((step: any) => ({
      text: step.maneuver.type + (step.maneuver.modifier ? ' ' + step.maneuver.modifier : ''),
      distanceKm: step.distance / 1000,
      durationMinutes: step.duration / 60
    }));

    return {
      polyline,
      distanceKm: route.distance / 1000, // OSRM ritorna in metri
      durationMinutes: route.duration / 60, // OSRM ritorna in secondi
      instructions
    };

  } catch (e) {
    console.error('Error fetching directions with OSRM:', e);
    return null;
  }
};
