import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TutorStatus } from '../types/tutor';

interface Props {
  status: TutorStatus;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  let bgColor = '#333';
  let text = '';

  if (status === 'safe') {
    bgColor = '#2ecc71';
    text = 'Media entro il limite';
  } else if (status === 'warning') {
    bgColor = '#f39c12';
    text = 'Vicino al limite medio';
  } else if (status === 'over_limit') {
    bgColor = '#e74c3c';
    text = 'Media sopra il limite';
  } else {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  }
});
