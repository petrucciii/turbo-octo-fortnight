import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  message: string;
}

export const TutorCompletionToast: React.FC<Props> = ({ message }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tutor Safe</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 214,
    backgroundColor: '#eafaf1',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2e7d32',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 8,
  },
  title: {
    color: '#1b5e20',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  message: {
    color: '#0f2f18',
    fontSize: 14,
    fontWeight: '800',
  },
});
