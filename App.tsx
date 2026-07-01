import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SplashScreen } from './src/screens/SplashScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HomeMapScreen } from './src/screens/HomeMapScreen';
import { SearchDestinationScreen } from './src/screens/SearchDestinationScreen';
import { TutorSummaryScreen } from './src/screens/TutorSummaryScreen';
import { DemoModeScreen } from './src/screens/DemoModeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { StatusBar } from 'expo-status-bar';
import type { RootStackParamList } from './src/types/routes';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#111' } }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="HomeMap" component={HomeMapScreen} />
        <Stack.Screen name="SearchDestination" component={SearchDestinationScreen} />
        <Stack.Screen name="TutorSummary" component={TutorSummaryScreen} options={{ presentation: 'transparentModal' }} />
        <Stack.Screen name="DemoMode" component={DemoModeScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
