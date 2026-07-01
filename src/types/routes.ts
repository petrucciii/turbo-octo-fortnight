import type { TutorSession } from './tutor';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  HomeMap: undefined;
  SearchDestination: { mode?: 'origin' | 'destination' } | undefined;
  TutorSummary: { session: TutorSession };
  DemoMode: undefined;
  Settings: undefined;
};
