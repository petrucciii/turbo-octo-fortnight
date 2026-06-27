import { create } from 'zustand';
import * as Location from 'expo-location';
import { LocationData } from '../types/location';

interface LocationState {
  currentLocation: LocationData | null;
  currentSpeedKmh: number | null;
  heading: number | null;
  locationPermission: Location.PermissionStatus | null;
  setCurrentLocation: (location: LocationData) => void;
  setCurrentSpeed: (speedKmh: number | null) => void;
  requestLocationPermission: () => Promise<boolean>;
}

export const useLocationStore = create<LocationState>((set) => ({
  currentLocation: null,
  currentSpeedKmh: null,
  heading: null,
  locationPermission: null,
  setCurrentLocation: (location) => set({ 
    currentLocation: location,
    currentSpeedKmh: location.speedKmh,
    heading: location.heading
  }),
  setCurrentSpeed: (speed) => set({ currentSpeedKmh: speed }),
  requestLocationPermission: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    set({ locationPermission: status });
    return status === 'granted';
  },
}));
