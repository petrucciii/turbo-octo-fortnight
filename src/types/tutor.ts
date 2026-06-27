import { Coordinate } from './navigation';

export interface TutorSegment {
  id: string;
  name: string;
  highway_name: string;
  direction: string;
  start_latitude: number;
  start_longitude: number;
  end_latitude: number;
  end_longitude: number;
  speed_limit_kmh: number;
  segment_length_km: number;
  start_radius_meters: number;
  end_radius_meters: number;
  is_active: boolean;
  notes?: string;
}

export type TutorStatus = 'safe' | 'warning' | 'over_limit' | 'inactive';

export interface TutorSession {
  id?: string;
  tutor_segment_id: string;
  entry_time: number; // timestamp in ms
  exit_time?: number;
  entry_latitude: number;
  entry_longitude: number;
  exit_latitude?: number;
  exit_longitude?: number;
  speed_limit_kmh: number;
  average_speed_kmh?: number;
  max_speed_kmh?: number;
  recommended_speed_kmh?: number;
  result_status?: string;
}
