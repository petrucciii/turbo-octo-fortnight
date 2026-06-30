import React from 'react';
import { StyleSheet, View } from 'react-native';

interface Props {
  heading: number | null;
}

const getSafeHeading = (heading: number | null): number => {
  return typeof heading === 'number' && Number.isFinite(heading) ? heading : 0;
};

export const UserPositionArrow: React.FC<Props> = ({ heading }) => {
  const rotation = getSafeHeading(heading);

  return (
    <View style={[styles.container, { transform: [{ rotate: `${rotation}deg` }] }]}>
      <View style={styles.glow} />
      <View style={styles.headOutline} />
      <View style={styles.tailOutline} />
      <View style={styles.head} />
      <View style={styles.tail} />
      <View style={styles.core} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.36,
    shadowRadius: 5,
    elevation: 9,
  },
  glow: {
    position: 'absolute',
    width: 18,
    height: 24,
    borderRadius: 10,
    backgroundColor: 'rgba(34,211,238,0.18)',
  },
  headOutline: {
    position: 'absolute',
    top: 2,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(15,23,42,0.88)',
  },
  tailOutline: {
    position: 'absolute',
    top: 17,
    width: 10,
    height: 11,
    borderRadius: 5,
    backgroundColor: 'rgba(15,23,42,0.88)',
  },
  head: {
    position: 'absolute',
    top: 4,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#38BDF8',
  },
  tail: {
    position: 'absolute',
    top: 17,
    width: 6,
    height: 9,
    borderRadius: 3,
    backgroundColor: '#0EA5E9',
  },
  core: {
    position: 'absolute',
    top: 15,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0F2FE',
  },
});
