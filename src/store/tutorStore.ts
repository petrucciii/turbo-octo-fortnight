import { create } from 'zustand';
import { TutorSegment, TutorStatus, TutorSession } from '../types/tutor';
import { Coordinate } from '../types/navigation';
import { supabase } from '../api/supabaseClient';

interface TutorState {
  tutorSegments: TutorSegment[];
  activeTutorSegment: TutorSegment | null;
  tutorSessionActive: boolean;
  tutorEntryTime: number | null;
  tutorEntryLocation: Coordinate | null;
  distanceTravelledKm: number;
  averageSpeedKmh: number;
  recommendedSpeedKmh: number | null;
  tutorStatus: TutorStatus;
  hasSpokenEntryWarning: boolean;
  hasSpokenOverLimitWarning: boolean;
  hasSpokenReturnSafeWarning: boolean;
  
  loadTutorSegments: () => Promise<void>;
  startTutorSession: (segment: TutorSegment, entryLocation: Coordinate, entryTime: number) => void;
  updateTutorSession: (distanceTravelledKm: number, averageSpeedKmh: number, recommendedSpeedKmh: number | null, tutorStatus: TutorStatus) => void;
  endTutorSession: (exitLocation: Coordinate, exitTime: number) => Promise<TutorSession | null>;
  setSpokenEntryWarning: (val: boolean) => void;
  setSpokenOverLimitWarning: (val: boolean) => void;
  setSpokenReturnSafeWarning: (val: boolean) => void;
  reset: () => void;
}

export const useTutorStore = create<TutorState>((set, get) => ({
  tutorSegments: [],
  activeTutorSegment: null,
  tutorSessionActive: false,
  tutorEntryTime: null,
  tutorEntryLocation: null,
  distanceTravelledKm: 0,
  averageSpeedKmh: 0,
  recommendedSpeedKmh: null,
  tutorStatus: 'inactive',
  hasSpokenEntryWarning: false,
  hasSpokenOverLimitWarning: false,
  hasSpokenReturnSafeWarning: false,

  loadTutorSegments: async () => {
    try {
      const { data, error } = await supabase
        .from('tutor_segments')
        .select('*')
        .eq('is_active', true);
        
      if (error) {
        console.error('Error loading tutor segments:', error);
        return;
      }
      if (data) {
        set({ tutorSegments: data });
      }
    } catch (e) {
      console.error('Failed to fetch tutor segments:', e);
    }
  },

  startTutorSession: (segment, entryLocation, entryTime) => {
    set({
      activeTutorSegment: segment,
      tutorSessionActive: true,
      tutorEntryTime: entryTime,
      tutorEntryLocation: entryLocation,
      distanceTravelledKm: 0,
      averageSpeedKmh: 0,
      recommendedSpeedKmh: segment.speed_limit_kmh,
      tutorStatus: 'safe',
      hasSpokenEntryWarning: false,
      hasSpokenOverLimitWarning: false,
      hasSpokenReturnSafeWarning: false,
    });
  },

  updateTutorSession: (distanceTravelledKm, averageSpeedKmh, recommendedSpeedKmh, tutorStatus) => {
    set({
      distanceTravelledKm,
      averageSpeedKmh,
      recommendedSpeedKmh,
      tutorStatus
    });
  },

  endTutorSession: async (exitLocation, exitTime) => {
    const state = get();
    if (!state.activeTutorSegment || !state.tutorEntryLocation || !state.tutorEntryTime) return null;

    const session: TutorSession = {
      tutor_segment_id: state.activeTutorSegment.id,
      entry_time: state.tutorEntryTime,
      exit_time: exitTime,
      entry_latitude: state.tutorEntryLocation.latitude,
      entry_longitude: state.tutorEntryLocation.longitude,
      exit_latitude: exitLocation.latitude,
      exit_longitude: exitLocation.longitude,
      speed_limit_kmh: state.activeTutorSegment.speed_limit_kmh,
      average_speed_kmh: state.averageSpeedKmh,
      recommended_speed_kmh: state.recommendedSpeedKmh || undefined,
      result_status: state.tutorStatus
    };

    // Salva su supabase
    try {
      await supabase.from('tutor_sessions').insert(session);
    } catch (e) {
      console.error('Failed to save tutor session:', e);
    }

    set({
      activeTutorSegment: null,
      tutorSessionActive: false,
      tutorEntryTime: null,
      tutorEntryLocation: null,
      distanceTravelledKm: 0,
      averageSpeedKmh: 0,
      recommendedSpeedKmh: null,
      tutorStatus: 'inactive',
    });

    return session;
  },

  setSpokenEntryWarning: (val) => set({ hasSpokenEntryWarning: val }),
  setSpokenOverLimitWarning: (val) => set({ hasSpokenOverLimitWarning: val }),
  setSpokenReturnSafeWarning: (val) => set({ hasSpokenReturnSafeWarning: val }),
  
  reset: () => set({
    activeTutorSegment: null,
    tutorSessionActive: false,
    tutorEntryTime: null,
    tutorEntryLocation: null,
    distanceTravelledKm: 0,
    averageSpeedKmh: 0,
    recommendedSpeedKmh: null,
    tutorStatus: 'inactive',
    hasSpokenEntryWarning: false,
    hasSpokenOverLimitWarning: false,
    hasSpokenReturnSafeWarning: false,
  })
}));
