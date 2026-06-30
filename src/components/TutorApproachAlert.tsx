import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TutorSegment } from '../types/tutor';
import { formatDistance } from '../utils/formatting';

interface Props {
  segment: TutorSegment;
  distanceKm: number;
}

export const TutorApproachAlert: React.FC<Props> = ({ segment, distanceKm }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>Tutor Safe</Text>
      <Text style={styles.title}>
        Tra {formatDistance(distanceKm)} entri in un tratto controllato da Tutor.
      </Text>
      <Text style={styles.subtitle}>
        {segment.highway_name} {segment.name} · limite {segment.speed_limit_kmh} km/h
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 142,
    backgroundColor: '#151f2b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3498db',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  kicker: {
    color: '#3498db',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    color: '#a7b4c5',
    fontSize: 12,
    marginTop: 6,
  },
});
