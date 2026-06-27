import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { formatDistance, formatDuration } from '../utils/formatting';
import { Place, RouteInfo } from '../types/navigation';

interface Props {
  destination: Place;
  route: RouteInfo;
  hasTutorSegments: boolean;
  onStart: () => void;
  onCancel: () => void;
}

export const RoutePreviewCard: React.FC<Props> = ({ destination, route, hasTutorSegments, onStart, onCancel }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{destination.name}</Text>
      <Text style={styles.address}>{destination.address}</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatDistance(route.distanceKm)}</Text>
          <Text style={styles.statLabel}>Distanza</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatDuration(route.durationMinutes * 60)}</Text>
          <Text style={styles.statLabel}>Tempo stimato</Text>
        </View>
      </View>

      {hasTutorSegments && (
        <View style={styles.tutorWarning}>
          <Text style={styles.tutorWarningText}>
            Zone a velocità media rilevate lungo il percorso.
          </Text>
        </View>
      )}

      <View style={styles.buttonsRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Annulla</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.startButton} onPress={onStart}>
          <Text style={styles.startButtonText}>Inizia navigazione</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1c1c1e',
    padding: 24,
    paddingBottom: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498db',
  },
  statLabel: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 2,
  },
  tutorWarning: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  tutorWarningText: {
    color: '#3498db',
    fontSize: 14,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  startButton: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#3498db',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
