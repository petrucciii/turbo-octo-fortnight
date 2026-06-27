import { create } from 'zustand';

interface SettingsState {
  voiceAlertsEnabled: boolean;
  vibrationEnabled: boolean;
  darkModeEnabled: boolean;
  setVoiceAlertsEnabled: (enabled: boolean) => void;
  setVibrationEnabled: (enabled: boolean) => void;
  setDarkModeEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  voiceAlertsEnabled: true,
  vibrationEnabled: true,
  darkModeEnabled: true, // Tema scuro premium sempre attivo per default
  setVoiceAlertsEnabled: (enabled) => set({ voiceAlertsEnabled: enabled }),
  setVibrationEnabled: (enabled) => set({ vibrationEnabled: enabled }),
  setDarkModeEnabled: (enabled) => set({ darkModeEnabled: enabled }),
}));
