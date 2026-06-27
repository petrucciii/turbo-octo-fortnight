export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface Place {
  id: string;
  name: string;
  address: string;
  location: Coordinate;
}

export interface RouteInfo {
  polyline: RoutePoint[];
  distanceKm: number;
  durationMinutes: number;
  instructions: RouteInstruction[];
}

export interface RouteInstruction {
  text: string;
  distanceKm: number;
  durationMinutes: number;
}
