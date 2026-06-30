import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MapDisplayType } from '../types/navigation';

interface Props {
  isFollowingUser: boolean;
  mapType: MapDisplayType;
  onRecenter: () => void;
  onToggleMapType: () => void;
}

export const NavigationSideControls: React.FC<Props> = ({
  isFollowingUser,
  mapType,
  onRecenter,
  onToggleMapType,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, !isFollowingUser && styles.buttonActive]}
        onPress={onRecenter}
      >
        <Text style={[styles.primaryIcon, !isFollowingUser && styles.iconActive]}>LOC</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onToggleMapType}>
        <Text style={styles.secondaryIcon}>{mapType === 'hybrid' ? 'SAT' : 'MAP'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 14,
    top: 214,
    gap: 10,
  },
  button: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 8,
  },
  buttonActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(12,74,110,0.92)',
  },
  primaryIcon: {
    color: '#E5E7EB',
    fontSize: 11,
    fontWeight: '900',
  },
  secondaryIcon: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '900',
  },
  iconActive: {
    color: '#E0F2FE',
  },
});
