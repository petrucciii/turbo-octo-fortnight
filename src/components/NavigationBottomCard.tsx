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
      <View style={styles.handle} />
      <View style={styles.row}>
        <View style={styles.summary}>
          <Text style={styles.duration}>{formatNavigationDuration(durationRemainingMinutes)}</Text>
          <Text style={styles.details}>
            {formatDistance(distanceRemainingKm)} · {etaString}
          </Text>
        </View>
        <TouchableOpacity style={styles.optionsButton}>
          <Text style={styles.optionsIcon}>⇄</Text>
        </TouchableOpacity>
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
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 58,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#d0d0d0',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  summary: {
    flex: 1,
  },
  duration: {
    color: '#24823d',
    fontSize: 42,
    fontWeight: '800',
  },
  details: {
    color: '#5f6368',
    fontSize: 21,
    fontWeight: '500',
    marginTop: 2,
  },
  optionsButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f1f3f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsIcon: {
    color: '#222',
    fontSize: 30,
    fontWeight: '900',
  },
  exitButton: {
    width: 92,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e0312d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
});
