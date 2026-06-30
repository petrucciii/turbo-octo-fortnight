import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  isFollowingUser: boolean;
  onRecenter: () => void;
  onCompass: () => void;
  onAudioToggle: () => void;
  onReport: () => void;
}

export const NavigationSideControls: React.FC<Props> = ({
  isFollowingUser,
  onRecenter,
  onCompass,
  onAudioToggle,
  onReport,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, !isFollowingUser && styles.buttonActive]}
        onPress={onRecenter}
      >
        <Text style={[styles.icon, !isFollowingUser && styles.iconActive]}>⌖</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onCompass}>
        <Text style={styles.compass}>N</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onAudioToggle}>
        <Text style={styles.icon}>AUD</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onReport}>
        <Text style={styles.warning}>!</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    top: 300,
    gap: 14,
  },
  button: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 8,
  },
  buttonActive: {
    backgroundColor: '#e8f0ff',
    borderWidth: 2,
    borderColor: '#2f6fff',
  },
  icon: {
    color: '#1f2933',
    fontSize: 18,
    fontWeight: '900',
  },
  iconActive: {
    color: '#2f6fff',
  },
  compass: {
    color: '#d92d20',
    fontSize: 18,
    fontWeight: '900',
  },
  warning: {
    color: '#b7791f',
    fontSize: 28,
    fontWeight: '900',
  },
});
