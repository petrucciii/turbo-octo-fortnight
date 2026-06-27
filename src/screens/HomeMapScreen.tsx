import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Text } from 'react-native';
import { MapViewComponent } from '../components/MapViewComponent';
import { SearchBar } from '../components/SearchBar';
import { useLocationStore } from '../store/locationStore';
import { useNavigationStore } from '../store/navigationStore';
import { useTutorStore } from '../store/tutorStore';
import * as Location from 'expo-location';
import { RoutePreviewCard } from '../components/RoutePreviewCard';
import { NavigationBottomCard } from '../components/NavigationBottomCard';
import { TutorSafeCard } from '../components/TutorSafeCard';
import { getDirections } from '../api/googleDirections';
import { isNearPoint, calculateDistanceBetweenCoordinates } from '../utils/geo';
import { calculateAverageSpeed, calculateRecommendedSpeed, getTutorStatus, calculateRemainingDistance } from '../utils/tutorCalculations';
import { speak } from '../utils/speech';

export const HomeMapScreen = ({ navigation }: any) => {
  const { currentLocation, setCurrentLocation, setCurrentSpeed, requestLocationPermission } = useLocationStore();
  const { origin, destination, route, isNavigating, distanceRemainingKm, durationRemainingMinutes, eta, setRoute, startNavigation, stopNavigation, updateRouteProgress } = useNavigationStore();
  const tutorStore = useTutorStore();
  const [subscription, setSubscription] = useState<Location.LocationSubscription | null>(null);

  useEffect(() => {
    const init = async () => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('Permesso negato', 'Per usare la navigazione serve il permesso di geolocalizzazione.');
        return;
      }

      await tutorStore.loadTutorSegments();

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 10,
        },
        (location) => {
          const locData = {
            coordinate: { latitude: location.coords.latitude, longitude: location.coords.longitude },
            speedKmh: location.coords.speed !== null ? location.coords.speed * 3.6 : null,
            heading: location.coords.heading,
            timestamp: location.timestamp,
            accuracy: location.coords.accuracy,
          };
          setCurrentLocation(locData);
          setCurrentSpeed(locData.speedKmh);

          if (isNavigating) {
            handleNavigationTick(locData);
          }
        }
      );
      setSubscription(sub);
    };

    init();
    return () => {
      if (subscription) subscription.remove();
    };
  }, [isNavigating]); // Riavvia watch se isNavigating cambia per aggiornare logica

  const handleNavigationTick = (locData: any) => {
    const userLat = locData.coordinate.latitude;
    const userLon = locData.coordinate.longitude;
    const now = Date.now();

    // 1. Controllo Tutor
    if (!tutorStore.tutorSessionActive) {
      // Cerca ingresso in un segmento
      const segment = tutorStore.tutorSegments.find(s => 
        isNearPoint(userLat, userLon, s.start_latitude, s.start_longitude, s.start_radius_meters)
      );
      if (segment) {
        tutorStore.startTutorSession(segment, locData.coordinate, now);
        speak('Sei entrato in una tratta a velocità media. Assistente TutorSafe attivo.');
        tutorStore.setSpokenEntryWarning(true);
      }
    } else if (tutorStore.activeTutorSegment && tutorStore.tutorEntryLocation && tutorStore.tutorEntryTime) {
      const segment = tutorStore.activeTutorSegment;
      
      // Controllo uscita
      if (isNearPoint(userLat, userLon, segment.end_latitude, segment.end_longitude, segment.end_radius_meters)) {
        speak('Tratta a velocità media completata.');
        tutorStore.endTutorSession(locData.coordinate, now).then(session => {
           if(session) {
             navigation.navigate('TutorSummary', { session });
           }
        });
      } else {
        // Aggiorna calcoli in tempo reale
        const elapsedSeconds = (now - tutorStore.tutorEntryTime) / 1000;
        const distanceTravelledKm = calculateDistanceBetweenCoordinates(
          tutorStore.tutorEntryLocation.latitude, 
          tutorStore.tutorEntryLocation.longitude, 
          userLat, 
          userLon
        );
        
        const avgSpeed = calculateAverageSpeed(distanceTravelledKm, elapsedSeconds);
        const recSpeed = calculateRecommendedSpeed(segment.segment_length_km, distanceTravelledKm, elapsedSeconds, segment.speed_limit_kmh);
        const status = getTutorStatus(avgSpeed, segment.speed_limit_kmh);

        tutorStore.updateTutorSession(distanceTravelledKm, avgSpeed, recSpeed, status);

        // Notifiche vocali tutor
        if (status === 'over_limit' && !tutorStore.hasSpokenOverLimitWarning) {
          speak('Media sopra il limite. Riduci la velocità in sicurezza.');
          tutorStore.setSpokenOverLimitWarning(true);
          tutorStore.setSpokenReturnSafeWarning(false);
        } else if (status === 'safe' && tutorStore.hasSpokenOverLimitWarning && !tutorStore.hasSpokenReturnSafeWarning) {
          speak('Media tornata entro il limite.');
          tutorStore.setSpokenReturnSafeWarning(true);
          tutorStore.setSpokenOverLimitWarning(false);
        }
      }
    }

    // 2. Aggiornamento rotta (simulato)
    if (route && destination) {
      const distToDest = calculateDistanceBetweenCoordinates(userLat, userLon, destination.location.latitude, destination.location.longitude);
      // Supponendo velocità media 60kmh per tempo stimato (semplificazione)
      const durationRemaining = (distToDest / 60) * 60; 
      updateRouteProgress(distToDest, durationRemaining, "Procedi dritto");
    }
  };

  useEffect(() => {
    if (currentLocation && destination && !route && !isNavigating) {
      getDirections(currentLocation.coordinate, destination.location).then(r => setRoute(r));
    }
  }, [destination, currentLocation]);

  return (
    <View style={styles.container}>
      <MapViewComponent 
        userLocation={currentLocation?.coordinate || null} 
        route={route} 
        tutorSegments={tutorStore.tutorSegments}
        activeTutorSegment={tutorStore.activeTutorSegment}
        destination={destination?.location || null}
      />
      
      {!isNavigating && !destination && (
        <SearchBar onPress={() => navigation.navigate('SearchDestination')} />
      )}

      {destination && route && !isNavigating && (
        <RoutePreviewCard 
          destination={destination} 
          route={route} 
          hasTutorSegments={tutorStore.tutorSegments.length > 0} 
          onStart={startNavigation} 
          onCancel={() => { setRoute(null); useNavigationStore.getState().setDestination(null); }} 
        />
      )}

      {isNavigating && (
        <>
          <NavigationBottomCard 
            distanceRemainingKm={distanceRemainingKm}
            durationRemainingMinutes={durationRemainingMinutes}
            eta={eta}
            onStop={() => { stopNavigation(); tutorStore.reset(); }}
          />
          {tutorStore.tutorSessionActive && tutorStore.activeTutorSegment && (
            <TutorSafeCard 
              segment={tutorStore.activeTutorSegment}
              averageSpeedKmh={tutorStore.averageSpeedKmh}
              currentSpeedKmh={currentLocation?.speedKmh || null}
              recommendedSpeedKmh={tutorStore.recommendedSpeedKmh}
              distanceRemainingKm={calculateRemainingDistance(tutorStore.activeTutorSegment.segment_length_km, tutorStore.distanceTravelledKm)}
              status={tutorStore.tutorStatus}
            />
          )}
        </>
      )}

      {!isNavigating && (
         <View style={styles.topRightControls}>
           <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Settings')}>
             <Text style={styles.iconText}>⚙️</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('DemoMode')}>
             <Text style={styles.iconText}>🎮</Text>
           </TouchableOpacity>
         </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  topRightControls: {
    position: 'absolute',
    top: 50,
    right: 20,
    gap: 10,
  },
  iconButton: {
    backgroundColor: '#1c1c1e',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  iconText: {
    fontSize: 20,
  }
});
