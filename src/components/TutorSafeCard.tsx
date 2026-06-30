import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TutorStatus, TutorSegment } from '../types/tutor';
import { formatSpeed, formatDistance } from '../utils/formatting';

interface Props {
  segment: TutorSegment;
  averageSpeedKmh: number;
  currentSpeedKmh: number | null;
  recommendedSpeedKmh: number | null;
  distanceRemainingKm: number;
  timeRemainingMinutes: number | null;
  status: TutorStatus;
}

const getStatusText = (status: TutorStatus): string => {
  if (status === 'over_limit') return 'Media alta';
  if (status === 'warning') return 'Attenzione';
  if (status === 'safe') return 'OK';
  return 'Inattivo';
};

export const TutorSafeCard: React.FC<Props> = ({
  segment,
  averageSpeedKmh,
  currentSpeedKmh,
  recommendedSpeedKmh,
  distanceRemainingKm,
  status,
}) => {
  const isOverLimit = status === 'over_limit';

  return (
    <View style={[styles.container, isOverLimit && styles.containerAlert]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Tutor attivo</Text>
          <Text style={styles.title} numberOfLines={1}>{segment.name}</Text>
        </View>
        <View style={[styles.statusPill, isOverLimit && styles.statusPillAlert]}>
          <Text style={styles.statusText}>{getStatusText(status)}</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{segment.speed_limit_kmh}</Text>
          <Text style={styles.metricLabel}>Limite</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{formatSpeed(averageSpeedKmh)}</Text>
          <Text style={styles.metricLabel}>Media</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{formatSpeed(currentSpeedKmh)}</Text>
          <Text style={styles.metricLabel}>Ora</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{formatDistance(distanceRemainingKm)}</Text>
          <Text style={styles.metricLabel}>Fine</Text>
        </View>
      </View>

      {isOverLimit ? (
        <Text style={styles.warningText}>
          Rallenta in sicurezza
          {recommendedSpeedKmh ? ` · target ${formatSpeed(recommendedSpeedKmh)} km/h` : ''}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 146,
    left: 14,
    right: 74,
    backgroundColor: 'rgba(24,24,37,0.92)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.26,
    shadowRadius: 10,
    elevation: 14,
    zIndex: 100,
  },
  containerAlert: {
    borderColor: '#FB503B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  kicker: {
    color: '#FDBA74',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '900',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  statusPill: {
    borderRadius: 12,
    backgroundColor: 'rgba(34,197,94,0.22)',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusPillAlert: {
    backgroundColor: 'rgba(251,80,59,0.24)',
  },
  statusText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '900',
  },
  metrics: {
    flexDirection: 'row',
    gap: 8,
  },
  metric: {
    flex: 1,
  },
  metricValue: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  warningText: {
    color: '#FDBA74',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 9,
  },
});
