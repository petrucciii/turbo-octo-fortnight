import { create } from 'zustand';
import { Place, RouteInfo } from '../types/navigation';

interface NavigationState {
  origin: Place | null;
  destination: Place | null;
  route: RouteInfo | null;
  eta: Date | null;
  distanceRemainingKm: number;
  durationRemainingMinutes: number;
  isNavigating: boolean;
  currentInstruction: string | null;
  nextInstruction: string | null;
  currentRoadName: string | null;
  isOffRoute: boolean;
  
  setOrigin: (place: Place | null) => void;
  setDestination: (place: Place | null) => void;
  setRoute: (route: RouteInfo | null) => void;
  startNavigation: () => void;
  stopNavigation: () => void;
  clearNavigationPlan: () => void;
  updateRouteProgress: (
    distanceRemaining: number,
    durationRemaining: number,
    instruction: string,
    currentRoadName?: string | null,
    nextInstruction?: string | null,
    isOffRoute?: boolean
  ) => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  origin: null,
  destination: null,
  route: null,
  eta: null,
  distanceRemainingKm: 0,
  durationRemainingMinutes: 0,
  isNavigating: false,
  currentInstruction: null,
  nextInstruction: null,
  currentRoadName: null,
  isOffRoute: false,

  setOrigin: (place) => set({ origin: place }),
  setDestination: (place) => set({ destination: place }),
  setRoute: (route) => {
    if (route) {
      const eta = new Date();
      eta.setMinutes(eta.getMinutes() + route.durationMinutes);
      set({ 
        route, 
        distanceRemainingKm: route.distanceKm, 
        durationRemainingMinutes: route.durationMinutes,
        eta 
      });
    } else {
      set({
        route: null,
        distanceRemainingKm: 0,
        durationRemainingMinutes: 0,
        eta: null,
        currentInstruction: null,
        nextInstruction: null,
        currentRoadName: null,
        isOffRoute: false,
      });
    }
  },
  
  startNavigation: () => {
    const firstInstruction = get().route?.instructions[0]?.text ?? 'Procedi verso la destinazione';
    set({ isNavigating: true, currentInstruction: firstInstruction });
  },
  
  stopNavigation: () => set({ 
    isNavigating: false,
    route: null,
    origin: null,
    destination: null,
    distanceRemainingKm: 0,
    durationRemainingMinutes: 0,
    eta: null,
    currentInstruction: null,
    nextInstruction: null,
    currentRoadName: null,
    isOffRoute: false,
  }),

  clearNavigationPlan: () => set({
    origin: null,
    destination: null,
    route: null,
    eta: null,
    distanceRemainingKm: 0,
    durationRemainingMinutes: 0,
    currentInstruction: null,
    nextInstruction: null,
    currentRoadName: null,
    isOffRoute: false,
  }),

  updateRouteProgress: (
    distanceRemaining,
    durationRemaining,
    instruction,
    currentRoadName = null,
    nextInstruction = null,
    isOffRoute = false
  ) => {
    const eta = new Date();
    eta.setMinutes(eta.getMinutes() + durationRemaining);
    set({
      distanceRemainingKm: distanceRemaining,
      durationRemainingMinutes: durationRemaining,
      currentInstruction: instruction,
      nextInstruction,
      currentRoadName,
      isOffRoute,
      eta
    });
  }
}));
