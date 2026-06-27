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
  
  setOrigin: (place: Place | null) => void;
  setDestination: (place: Place | null) => void;
  setRoute: (route: RouteInfo | null) => void;
  startNavigation: () => void;
  stopNavigation: () => void;
  updateRouteProgress: (distanceRemaining: number, durationRemaining: number, instruction: string) => void;
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
      set({ route: null, distanceRemainingKm: 0, durationRemainingMinutes: 0, eta: null });
    }
  },
  
  startNavigation: () => set({ isNavigating: true }),
  
  stopNavigation: () => set({ 
    isNavigating: false,
    route: null,
    destination: null,
    distanceRemainingKm: 0,
    durationRemainingMinutes: 0,
    eta: null,
    currentInstruction: null
  }),

  updateRouteProgress: (distanceRemaining, durationRemaining, instruction) => {
    const eta = new Date();
    eta.setMinutes(eta.getMinutes() + durationRemaining);
    set({
      distanceRemainingKm: distanceRemaining,
      durationRemainingMinutes: durationRemaining,
      currentInstruction: instruction,
      eta
    });
  }
}));
