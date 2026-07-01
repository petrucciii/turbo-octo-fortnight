import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { formatSpeed } from '../utils/formatting';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'TutorSummary'>;

export const TutorSummaryScreen = ({ route, navigation }: Props) => {
  const { session } = route.params;

  const handleClose = () => {
    navigation.goBack();
  };

  const isSuccess = session.result_status === 'safe' || session.result_status === 'warning';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={[styles.iconContainer, { backgroundColor: isSuccess ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)' }]}>
          <Text style={styles.icon}>{isSuccess ? '✅' : '⚠️'}</Text>
        </View>
        <Text style={styles.title}>Tratta a velocità media completata</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Limite imposto</Text>
            <Text style={styles.statValue}>{formatSpeed(session.speed_limit_kmh)} km/h</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>La tua media finale</Text>
            <Text style={[styles.statValue, { color: isSuccess ? '#2ecc71' : '#e74c3c' }]}>
              {formatSpeed(session.average_speed_kmh)} km/h
            </Text>
          </View>
        </View>

        <View style={styles.resultBox}>
          <Text style={[styles.resultText, { color: isSuccess ? '#2ecc71' : '#e74c3c' }]}>
            {isSuccess 
              ? 'Tratta completata entro il limite medio.' 
              : 'Media finale sopra il limite.'}
          </Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleClose}>
          <Text style={styles.buttonText}>Chiudi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1c1c1e',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
  },
  statsContainer: {
    width: '100%',
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statLabel: {
    color: '#8e8e93',
    fontSize: 16,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultBox: {
    padding: 16,
    marginBottom: 30,
  },
  resultText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3498db',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
