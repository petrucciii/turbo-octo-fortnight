import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatDistance } from '../utils/formatting';

interface Props {
  distanceRemainingKm: number;
  durationRemainingMinutes: number;
  eta: Date | null;
  onStop: () => void;
}

const formatNavigationDuration = (minutes: number): string => {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 min';
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  return remainingMinutes > 0 ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
};

export const NavigationBottomCard: React.FC<Props> = ({
  distanceRemainingKm,
  durationRemainingMinutes,
  eta,
  onStop,
}) => {
  const etaString = eta
    ? `${eta.getHours().toString().padStart(2, '0')}:${eta.getMinutes().toString().padStart(2, '0')}`
    : '--:--';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.summary}>
          <Text style={styles.duration}>{formatNavigationDuration(durationRemainingMinutes)}</Text>
          <Text style={styles.details}>
            {formatDistance(distanceRemainingKm)} - {etaString}
          </Text>
        </View>
        <TouchableOpacity style={styles.exitButton} onPress={onStop}>
          <Text style={styles.exitText}>Esci</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 18,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(15,23,42,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summary: {
    flex: 1,
  },
  duration: {
    color: '#A7F3D0',
    fontSize: 26,
    fontWeight: '800',
  },
  details: {
    color: '#CBD5E1',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 1,
  },
  exitButton: {
    minWidth: 68,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FB503B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
});
