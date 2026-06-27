// Cross-platform speech wrapper
// On web, uses Web Speech API directly
// On native, uses expo-speech

import { Platform } from 'react-native';

export const speak = (text: string): void => {
  if (Platform.OS === 'web') {
    try {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'it-IT';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('Web Speech API not available:', e);
    }
  } else {
    // Lazy import expo-speech only on native
    try {
      const Speech = require('expo-speech');
      Speech.speak(text, { language: 'it-IT' });
    } catch (e) {
      console.warn('expo-speech not available:', e);
    }
  }
};
