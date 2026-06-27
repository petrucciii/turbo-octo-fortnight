import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { formatDistance, formatDuration } from '../utils/formatting';

interface Props {
  distanceRemainingKm: number;
  durationRemainingMinutes: number;
  eta: Date | null;
  onStop: () => void;
}

export const NavigationBottomCard: React.FC<Props> = ({ distanceRemainingKm, durationRemainingMinutes, eta, onStop }) => {
  
  const etaString = eta ? `${eta.getHours().toString().padStart(2, '0')}:${eta.getMinutes().toString().padStart(2, '0')}` : '--:--';

  return (
    <View style={styles.container}>
      <View style={styles.infoRow}>
        <View style={styles.infoBox}>
          <Text style={styles.value}>{etaString}</Text>
          <Text style={styles.label}>Arrivo</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.value}>{formatDuration(durationRemainingMinutes * 60)}</Text>
          <Text style={styles.label}>Tempo</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.value}>{formatDistance(distanceRemainingKm)}</Text>
          <Text style={styles.label}>Distanza</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.stopButton} onPress={onStop}>
        <Text style={styles.stopButtonText}>Termina Navigazione</Text>
      </TouchableOpacity>
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
    padding: 20,
    paddingBottom: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  infoBox: {
    alignItems: 'center',
    flex: 1,
  },
  value: {
    color: '#2ecc71',
    fontSize: 22,
    fontWeight: 'bold',
  },
  label: {
    color: '#8e8e93',
    fontSize: 14,
    marginTop: 4,
  },
  stopButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
