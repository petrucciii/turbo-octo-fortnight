import { Coordinate } from './navigation';

export interface LocationData {
  coordinate: Coordinate;
  speedKmh: number | null;
  heading: number | null;
  timestamp: number;
  accuracy: number | null;
}
