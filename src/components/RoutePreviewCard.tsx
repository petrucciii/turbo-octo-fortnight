import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatDistance, formatDuration } from '../utils/formatting';
import { Place, RouteInfo } from '../types/navigation';

interface Props {
  origin: Place;
  destination: Place;
  route: RouteInfo;
  tutorSegmentsCount: number;
  onStart: () => void;
  onCancel: () => void;
}

export const RoutePreviewCard: React.FC<Props> = ({
  origin,
  destination,
  route,
  tutorSegmentsCount,
  onStart,
  onCancel,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{destination.name}</Text>
      <Text style={styles.address} numberOfLines={2}>{destination.address}</Text>
      <Text style={styles.origin} numberOfLines={1}>Partenza: {origin.name}</Text>

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

      {route.instructions[0] ? (
        <View style={styles.instructionBox}>
          <Text style={styles.instructionLabel}>Prima indicazione</Text>
          <Text style={styles.instructionText}>{route.instructions[0].text}</Text>
        </View>
      ) : null}

      {tutorSegmentsCount > 0 ? (
        <View style={styles.tutorWarning}>
          <Text style={styles.tutorWarningText}>
            {tutorSegmentsCount} tratto Tutor rilevato lungo il percorso.
          </Text>
        </View>
      ) : null}

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
    padding: 22,
    paddingBottom: 38,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 6,
  },
  origin: {
    color: '#c5c5c7',
    fontSize: 13,
    marginBottom: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3498db',
  },
  statLabel: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 2,
  },
  instructionBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  instructionLabel: {
    color: '#8e8e93',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  instructionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  tutorWarning: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  tutorWarningText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '700',
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
    fontWeight: '800',
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
    fontWeight: '800',
  },
});
