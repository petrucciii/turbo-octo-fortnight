import { create } from 'zustand';
import * as Location from 'expo-location';
import { LocationData } from '../types/location';

interface LocationState {
  currentLocation: LocationData | null;
  lastKnownLocation: LocationData | null;
  currentSpeedKmh: number | null;
  heading: number | null;
  lastValidHeading: number | null;
  locationPermission: Location.PermissionStatus | null;
  setCurrentLocation: (location: LocationData) => void;
  setHeading: (heading: number | null) => void;
  setCurrentSpeed: (speedKmh: number | null) => void;
  resetLocation: () => void;
  requestLocationPermission: () => Promise<boolean>;
}

const getValidHeading = (heading: number | null | undefined): number | null => {
  return typeof heading === 'number' && Number.isFinite(heading) ? heading : null;
};

export const useLocationStore = create<LocationState>((set) => ({
  currentLocation: null,
  lastKnownLocation: null,
  currentSpeedKmh: null,
  heading: null,
  lastValidHeading: null,
  locationPermission: null,
  setCurrentLocation: (location) => set((state) => {
    const validHeading = getValidHeading(location.heading);
    const safeHeading = validHeading ?? state.lastValidHeading;

    return {
      currentLocation: {
        ...location,
        heading: safeHeading,
      },
      lastKnownLocation: {
        ...location,
        heading: safeHeading,
      },
      currentSpeedKmh: location.speedKmh,
      heading: safeHeading,
      lastValidHeading: validHeading ?? state.lastValidHeading,
    };
  }),
  setHeading: (heading) => set((state) => {
    const validHeading = getValidHeading(heading);
    const safeHeading = validHeading ?? state.lastValidHeading;

    return {
      heading: safeHeading,
      lastValidHeading: validHeading ?? state.lastValidHeading,
      currentLocation: state.currentLocation
        ? { ...state.currentLocation, heading: safeHeading }
        : state.currentLocation,
      lastKnownLocation: state.lastKnownLocation
        ? { ...state.lastKnownLocation, heading: safeHeading }
        : state.lastKnownLocation,
    };
  }),
  setCurrentSpeed: (speed) => set({ currentSpeedKmh: speed }),
  resetLocation: () => set({
    currentLocation: null,
    lastKnownLocation: null,
    currentSpeedKmh: null,
    heading: null,
    lastValidHeading: null,
  }),
  requestLocationPermission: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    set({ locationPermission: status });
    return status === 'granted';
  },
}));
