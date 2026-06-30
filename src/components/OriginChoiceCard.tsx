import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Place } from '../types/navigation';

interface Props {
  destination: Place;
  canUseCurrentLocation: boolean;
  isWaitingForCurrentLocation?: boolean;
  onUseCurrentLocation: () => void;
  onChooseManualOrigin: () => void;
  onCancel: () => void;
}

export const OriginChoiceCard: React.FC<Props> = ({
  destination,
  canUseCurrentLocation,
  isWaitingForCurrentLocation = false,
  onUseCurrentLocation,
  onChooseManualOrigin,
  onCancel,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>Destinazione</Text>
      <Text style={styles.title}>{destination.name}</Text>
      <Text style={styles.address} numberOfLines={2}>{destination.address}</Text>

      <Text style={styles.question}>Da dove vuoi partire?</Text>

      <TouchableOpacity
        style={[styles.primaryButton, (!canUseCurrentLocation || isWaitingForCurrentLocation) && styles.disabledButton]}
        onPress={onUseCurrentLocation}
        disabled={isWaitingForCurrentLocation}
      >
        <Text style={styles.primaryButtonText}>
          {isWaitingForCurrentLocation ? 'Attendo posizione GPS...' : 'Usa la mia posizione attuale'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={onChooseManualOrigin}>
        <Text style={styles.secondaryButtonText}>Inserisci punto di partenza</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Annulla</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1c1c1e',
    padding: 22,
    paddingBottom: 36,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 20,
  },
  kicker: {
    color: '#8e8e93',
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  address: {
    color: '#8e8e93',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 18,
  },
  question: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 10,
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.09)',
    marginBottom: 10,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: '#8e8e93',
    fontSize: 14,
  },
});
