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
  streetName?: string;
  maneuverType?: string;
  modifier?: string;
  location?: Coordinate;
}

export interface RouteProgress {
  nearestPoint: Coordinate;
  nearestSegmentIndex: number;
  distanceFromRouteMeters: number;
  distanceTravelledKm: number;
  distanceRemainingKm: number;
  durationRemainingMinutes: number;
  currentInstruction: RouteInstruction | null;
  nextInstruction: RouteInstruction | null;
  currentRoadName: string | null;
  isOffRoute: boolean;
}
