import React from 'react';
import { StyleSheet, View } from 'react-native';

interface Props {
  heading: number | null;
  isNavigating: boolean;
}

const getSafeHeading = (heading: number | null): number => {
  return typeof heading === 'number' && Number.isFinite(heading) ? heading : 0;
};

export const UserPositionArrow: React.FC<Props> = ({ heading, isNavigating }) => {
  const rotation = getSafeHeading(heading);

  return (
    <View style={[styles.container, isNavigating && styles.containerNavigating, { transform: [{ rotate: `${rotation}deg` }] }]}>
      <View style={[styles.glow, isNavigating && styles.glowNavigating]} />
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
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.36,
    shadowRadius: 5,
    elevation: 9,
  },
  containerNavigating: {
    shadowOpacity: 0.44,
  },
  glow: {
    position: 'absolute',
    width: 20,
    height: 26,
    borderRadius: 10,
    backgroundColor: 'rgba(34,211,238,0.16)',
  },
  glowNavigating: {
    backgroundColor: 'rgba(34,211,238,0.24)',
  },
  headOutline: {
    position: 'absolute',
    top: 2,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 22,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(15,23,42,0.88)',
  },
  tailOutline: {
    position: 'absolute',
    top: 18,
    width: 11,
    height: 12,
    borderRadius: 5,
    backgroundColor: 'rgba(15,23,42,0.88)',
  },
  head: {
    position: 'absolute',
    top: 5,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 17,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#38BDF8',
  },
  tail: {
    position: 'absolute',
    top: 19,
    width: 6,
    height: 9,
    borderRadius: 3,
    backgroundColor: '#0EA5E9',
  },
  core: {
    position: 'absolute',
    top: 16,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0F2FE',
  },
});
