import React from 'react';
import { StyleSheet, View } from 'react-native';

interface Props {
  heading: number | null;
  isNavigating?: boolean;
}

const getSafeHeading = (heading: number | null): number => {
  return typeof heading === 'number' && Number.isFinite(heading) ? heading : 0;
};

export const UserPositionArrow: React.FC<Props> = ({ heading, isNavigating = false }) => {
  const rotation = getSafeHeading(heading);

  return (
    <View
      collapsable={false}
      pointerEvents="none"
      style={[styles.container, isNavigating && styles.containerNavigating, { transform: [{ rotate: `${rotation}deg` }] }]}
    >
      <View style={[styles.glow, isNavigating && styles.glowNavigating]} />
      <View style={styles.headOutline} />
      <View style={styles.tailOutline} />
      <View style={styles.innerShadow} />
      <View style={styles.head} />
      <View style={styles.tail} />
      <View style={styles.core} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
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
    width: 24,
    height: 30,
    borderRadius: 14,
    backgroundColor: 'rgba(124,58,237,0.18)',
  },
  glowNavigating: {
    backgroundColor: 'rgba(168,85,247,0.26)',
  },
  headOutline: {
    position: 'absolute',
    top: 1,
    left: 6,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 26,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(6,8,24,0.94)',
  },
  tailOutline: {
    position: 'absolute',
    top: 20,
    left: 11,
    width: 14,
    height: 12,
    borderRadius: 3,
    backgroundColor: 'rgba(6,8,24,0.94)',
  },
  innerShadow: {
    position: 'absolute',
    top: 5,
    left: 9,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(22,10,51,0.96)',
  },
  head: {
    position: 'absolute',
    top: 6,
    left: 10,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#8B5CF6',
  },
  tail: {
    position: 'absolute',
    top: 21,
    left: 14,
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#6D28D9',
  },
  core: {
    position: 'absolute',
    top: 16,
    left: 15.5,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#C4B5FD',
  },
});
