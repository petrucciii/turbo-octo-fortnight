import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  onNewDestination: () => void;
  onClose: () => void;
}

export const ArrivalPrompt: React.FC<Props> = ({ onNewDestination, onClose }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sei arrivato a destinazione</Text>
      <Text style={styles.subtitle}>La navigazione e il Tutor Safe sono stati chiusi.</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
          <Text style={styles.secondaryText}>Chiudi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={onNewDestination}>
          <Text style={styles.primaryText}>Nuova destinazione</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 28,
    backgroundColor: 'rgba(15,23,42,0.94)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.24)',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 18,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  secondaryButton: {
    flex: 0.8,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  primaryButton: {
    flex: 1.2,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22D3EE',
  },
  secondaryText: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryText: {
    color: '#082F49',
    fontSize: 14,
    fontWeight: '900',
  },
});
