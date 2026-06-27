import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { TutorSafeCard } from '../components/TutorSafeCard';
import { calculateAverageSpeed, calculateRecommendedSpeed, getTutorStatus } from '../utils/tutorCalculations';
import { TutorSegment } from '../types/tutor';
import { useTutorStore } from '../store/tutorStore';

const DEMO_SEGMENT: TutorSegment = {
  id: 'demo-1',
  name: 'Demo A4 verso Venezia',
  highway_name: 'A4',
  direction: 'Venezia',
  start_latitude: 45.4,
  start_longitude: 10.4,
  end_latitude: 45.4,
  end_longitude: 10.6,
  speed_limit_kmh: 130,
  segment_length_km: 10,
  start_radius_meters: 300,
  end_radius_meters: 300,
  is_active: true
};

export const DemoModeScreen = ({ navigation }: any) => {
  const [speed, setSpeed] = useState(130);
  const [distance, setDistance] = useState(0);
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const avgSpeed = calculateAverageSpeed(distance, timeSeconds);
  const recSpeed = calculateRecommendedSpeed(DEMO_SEGMENT.segment_length_km, distance, timeSeconds, DEMO_SEGMENT.speed_limit_kmh);
  const status = getTutorStatus(avgSpeed, DEMO_SEGMENT.speed_limit_kmh);
  const distRemaining = Math.max(0, DEMO_SEGMENT.segment_length_km - distance);

  useEffect(() => {
    let interval: any;
    if (isActive && distRemaining > 0) {
      interval = setInterval(() => {
        setTimeSeconds(t => t + 1);
        // Distanza percorsa in 1 secondo alla velocità attuale
        setDistance(d => d + (speed / 3600));
      }, 1000);
    } else if (isActive && distRemaining <= 0) {
      setIsActive(false);
      const session = {
        speed_limit_kmh: DEMO_SEGMENT.speed_limit_kmh,
        average_speed_kmh: avgSpeed,
        result_status: status
      };
      navigation.navigate('TutorSummary', { session });
    }
    return () => clearInterval(interval);
  }, [isActive, speed, distRemaining]);

  const toggleDemo = () => {
    if (!isActive) {
      setDistance(0);
      setTimeSeconds(0);
    }
    setIsActive(!isActive);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>Chiudi</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Modalità Demo</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.instructions}>
          Simula l'attraversamento di una tratta Tutor di 10 km con limite 130 km/h.
        </Text>

        {isActive ? (
          <View style={styles.cardContainer}>
            <TutorSafeCard 
              segment={DEMO_SEGMENT}
              averageSpeedKmh={avgSpeed}
              currentSpeedKmh={speed}
              recommendedSpeedKmh={recSpeed}
              distanceRemainingKm={distRemaining}
              status={status}
            />
          </View>
        ) : (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderText}>TutorSafe Inattivo</Text>
          </View>
        )}

        <View style={styles.controls}>
          <Text style={styles.speedLabel}>Velocità simulata: {Math.round(speed)} km/h</Text>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={80}
            maximumValue={180}
            value={speed}
            onValueChange={setSpeed}
            minimumTrackTintColor="#3498db"
            maximumTrackTintColor="#333"
            thumbTintColor="#fff"
          />

          <TouchableOpacity style={[styles.btn, isActive ? styles.btnStop : styles.btnStart]} onPress={toggleDemo}>
            <Text style={styles.btnText}>{isActive ? 'Ferma Simulazione' : 'Avvia Simulazione'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backBtn: {
    color: '#3498db',
    fontSize: 16,
    marginRight: 20,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  instructions: {
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 40,
  },
  cardContainer: {
    width: '100%',
    height: 250,
    position: 'relative',
  },
  placeholderCard: {
    width: '100%',
    height: 200,
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  placeholderText: {
    color: '#8e8e93',
    fontSize: 18,
  },
  controls: {
    width: '100%',
    marginTop: 'auto',
    backgroundColor: '#1c1c1e',
    padding: 20,
    borderRadius: 16,
  },
  speedLabel: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  btn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  btnStart: {
    backgroundColor: '#3498db',
  },
  btnStop: {
    backgroundColor: '#e74c3c',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
