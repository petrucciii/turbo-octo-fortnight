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
  setCurrentSpeed: (speedKmh: number | null) => void;
  resetLocation: () => void;
  requestLocationPermission: () => Promise<boolean>;
}

export const useLocationStore = create<LocationState>((set) => ({
  currentLocation: null,
  lastKnownLocation: null,
  currentSpeedKmh: null,
  heading: null,
  lastValidHeading: null,
  locationPermission: null,
  setCurrentLocation: (location) => set((state) => {
    const headingIsValid =
      typeof location.heading === 'number' &&
      Number.isFinite(location.heading);
    const safeHeading = headingIsValid ? location.heading : state.lastValidHeading;

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
      lastValidHeading: headingIsValid ? location.heading : state.lastValidHeading,
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
