import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatSpeed } from '../utils/formatting';

interface Props {
  currentSpeedKmh: number | null;
  speedLimitKmh: number | null;
}

export const SpeedLimitBox: React.FC<Props> = ({ currentSpeedKmh, speedLimitKmh }) => {
  return (
    <View style={styles.container}>
      {speedLimitKmh ? (
        <View style={styles.limitCircle}>
          <Text style={styles.limitText}>{Math.round(speedLimitKmh)}</Text>
        </View>
      ) : null}
      <View style={styles.speedBlock}>
        <Text style={styles.speedText}>{formatSpeed(currentSpeedKmh)}</Text>
        <Text style={styles.unit}>km/h</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    bottom: 100,
    minWidth: 96,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  limitCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: '#FB503B',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  limitText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '900',
  },
  speedBlock: {
    minWidth: 38,
    alignItems: 'center',
    paddingRight: 6,
  },
  speedText: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
  },
  unit: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
});
