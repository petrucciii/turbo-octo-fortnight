import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBadge } from './StatusBadge';
import { SpeedBadge } from './SpeedBadge';
import { TutorStatus, TutorSegment } from '../types/tutor';
import { formatSpeed, formatDistance } from '../utils/formatting';

interface Props {
  segment: TutorSegment;
  averageSpeedKmh: number;
  currentSpeedKmh: number | null;
  recommendedSpeedKmh: number | null;
  distanceRemainingKm: number;
  status: TutorStatus;
}

export const TutorSafeCard: React.FC<Props> = ({
  segment,
  averageSpeedKmh,
  currentSpeedKmh,
  recommendedSpeedKmh,
  distanceRemainingKm,
  status
}) => {
  
  let borderColor = '#333';
  if (status === 'safe') borderColor = '#2ecc71';
  else if (status === 'warning') borderColor = '#f39c12';
  else if (status === 'over_limit') borderColor = '#e74c3c';

  return (
    <View style={[styles.container, { borderColor }]}>
      <Text style={styles.title}>Assistente velocità media</Text>
      
      <StatusBadge status={status} />
      
      <View style={styles.speedsContainer}>
        <SpeedBadge 
          value={formatSpeed(averageSpeedKmh)} 
          label="Media attuale" 
          highlight 
          color={borderColor} 
        />
        <SpeedBadge 
          value={formatSpeed(segment.speed_limit_kmh)} 
          label="Limite" 
        />
        <SpeedBadge 
          value={formatSpeed(currentSpeedKmh)} 
          label="Velocità" 
        />
      </View>

      {status === 'over_limit' && recommendedSpeedKmh && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Per rientrare: massimo {formatSpeed(recommendedSpeedKmh)} km/h
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>{segment.highway_name} - {segment.name}</Text>
        <Text style={styles.footerText}>Mancano {formatDistance(distanceRemainingKm)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 100,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  speedsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  warningBox: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  warningText: {
    color: '#e74c3c',
    fontWeight: 'bold',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
  },
  footerText: {
    color: '#8e8e93',
    fontSize: 12,
  }
});
