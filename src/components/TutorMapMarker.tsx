import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  type: 'start' | 'end';
  active: boolean;
}

export const TutorMapMarker: React.FC<Props> = ({ type, active }) => {
  const isStart = type === 'start';
  const label = isStart ? 'Inizio Tutor' : 'Fine Tutor';

  return (
    <View style={[styles.container, active && styles.containerActive]}>
      <View style={[styles.icon, isStart ? styles.iconStart : styles.iconEnd, active && styles.iconActive]}>
        <View style={isStart ? styles.entryLine : styles.exitDot} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minWidth: 100,
    height: 28,
    borderRadius: 14,
    paddingLeft: 6,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.7)',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 8,
  },
  containerActive: {
    borderColor: 'rgba(168,85,247,0.9)',
    backgroundColor: 'rgba(30,27,75,0.9)',
  },
  icon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
  },
  iconStart: {
    backgroundColor: '#F97316',
  },
  iconEnd: {
    backgroundColor: '#A855F7',
  },
  iconActive: {
    backgroundColor: '#22D3EE',
  },
  entryLine: {
    width: 2,
    height: 9,
    borderRadius: 1,
    backgroundColor: '#FFF7ED',
  },
  exitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F5F3FF',
  },
  label: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '900',
  },
});
