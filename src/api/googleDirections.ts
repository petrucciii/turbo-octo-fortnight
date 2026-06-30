import { Coordinate, RouteInfo, RoutePoint } from '../types/navigation';

const getReadableModifier = (modifier?: string): string => {
  switch (modifier) {
    case 'right':
      return 'a destra';
    case 'left':
      return 'a sinistra';
    case 'slight right':
      return 'leggermente a destra';
    case 'slight left':
      return 'leggermente a sinistra';
    case 'sharp right':
      return 'tutto a destra';
    case 'sharp left':
      return 'tutto a sinistra';
    case 'straight':
      return 'dritto';
    case 'uturn':
      return 'inverti la marcia';
    default:
      return '';
  }
};

const withStreet = (text: string, streetName?: string): string => {
  if (!streetName) return text;
  return `${text} su ${streetName}`;
};

const getInstructionText = (step: any): string => {
  const maneuver = step.maneuver || {};
  const type = maneuver.type;
  const modifier = getReadableModifier(maneuver.modifier);
  const streetName = step.name || '';

  switch (type) {
    case 'depart':
      return withStreet('Parti', streetName);
    case 'arrive':
      return 'Arrivo a destinazione';
    case 'turn':
      return withStreet(`Svolta ${modifier || ''}`.trim(), streetName);
    case 'new name':
      return withStreet('Continua', streetName);
    case 'continue':
      return withStreet(modifier ? `Prosegui ${modifier}` : 'Prosegui', streetName);
    case 'merge':
      return withStreet(`Immettiti ${modifier || ''}`.trim(), streetName);
    case 'on ramp':
      return withStreet(`Prendi la rampa ${modifier || ''}`.trim(), streetName);
    case 'off ramp':
      return withStreet(`Prendi l'uscita ${modifier || ''}`.trim(), streetName);
    case 'fork':
      return withStreet(`Tieni ${modifier || ''}`.trim(), streetName);
    case 'roundabout':
    case 'rotary': {
      const exit = maneuver.exit ? `, prendi la ${maneuver.exit}a uscita` : '';
      return withStreet(`Alla rotonda${exit}`, streetName);
    }
    case 'exit roundabout':
    case 'exit rotary':
      return withStreet('Esci dalla rotonda', streetName);
    default:
      return withStreet(modifier ? `Procedi ${modifier}` : 'Procedi', streetName);
  }
};

export const getDirections = async (
  origin: Coordinate,
  destination: Coordinate
): Promise<RouteInfo | null> => {
  try {
    // OSRM e' un server pubblico gratuito. Le coordinate sono lon,lat.
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&steps=true&alternatives=false`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.warn('OSRM returned status:', data.code);
      return null;
    }

    const route = data.routes[0];
    const polyline: RoutePoint[] = route.geometry.coordinates.map((coord: number[]) => ({
      latitude: coord[1],
      longitude: coord[0],
    }));

    const instructions = route.legs[0].steps.map((step: any) => ({
      text: getInstructionText(step),
      distanceKm: step.distance / 1000,
      durationMinutes: step.duration / 60,
      streetName: step.name || undefined,
      maneuverType: step.maneuver?.type,
      modifier: step.maneuver?.modifier,
      location: step.maneuver?.location
        ? {
            latitude: step.maneuver.location[1],
            longitude: step.maneuver.location[0],
          }
        : undefined,
    }));

    return {
      polyline,
      distanceKm: route.distance / 1000,
      durationMinutes: route.duration / 60,
      instructions,
    };
  } catch (e) {
    console.error('Error fetching directions with OSRM:', e);
    return null;
  }
};
