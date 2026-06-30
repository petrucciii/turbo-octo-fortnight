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
    left: 16,
    bottom: 168,
    minWidth: 130,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  limitCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 4,
    borderColor: '#d92d20',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  limitText: {
    color: '#111',
    fontSize: 22,
    fontWeight: '900',
  },
  speedBlock: {
    minWidth: 48,
    alignItems: 'center',
    paddingRight: 6,
  },
  speedText: {
    color: '#111',
    fontSize: 24,
    fontWeight: '900',
  },
  unit: {
    color: '#333',
    fontSize: 13,
    fontWeight: '700',
  },
});
