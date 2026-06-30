import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBadge } from './StatusBadge';
import { SpeedBadge } from './SpeedBadge';
import { TutorStatus, TutorSegment } from '../types/tutor';
import { formatSpeed, formatDistance, formatDuration } from '../utils/formatting';

interface Props {
  segment: TutorSegment;
  averageSpeedKmh: number;
  currentSpeedKmh: number | null;
  recommendedSpeedKmh: number | null;
  distanceRemainingKm: number;
  timeRemainingMinutes: number | null;
  status: TutorStatus;
}

const formatCoordinate = (latitude: number, longitude: number): string => {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
};

export const TutorSafeCard: React.FC<Props> = ({
  segment,
  averageSpeedKmh,
  currentSpeedKmh,
  recommendedSpeedKmh,
  distanceRemainingKm,
  timeRemainingMinutes,
  status,
}) => {
  let borderColor = '#333';
  if (status === 'safe') borderColor = '#2ecc71';
  else if (status === 'warning') borderColor = '#f39c12';
  else if (status === 'over_limit') borderColor = '#e74c3c';

  return (
    <View style={[styles.container, { borderColor }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Tutor Safe attivo</Text>
          <Text style={styles.title}>{segment.highway_name} {segment.name}</Text>
        </View>
        <Text style={styles.limit}>{segment.speed_limit_kmh}</Text>
      </View>

      <StatusBadge status={status} />

      <View style={styles.speedsContainer}>
        <SpeedBadge
          value={formatSpeed(averageSpeedKmh)}
          label="Media"
          highlight
          color={borderColor}
        />
        <SpeedBadge
          value={formatSpeed(currentSpeedKmh)}
          label="Ora"
        />
        <SpeedBadge
          value={formatSpeed(segment.speed_limit_kmh)}
          label="Limite"
        />
      </View>

      {status === 'over_limit' ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Media attuale {formatSpeed(averageSpeedKmh)} km/h.{' '}
            {recommendedSpeedKmh
              ? `Per rientrare mantieni circa ${formatSpeed(recommendedSpeedKmh)} km/h fino alla fine.`
              : 'Non è più possibile rientrare nella media con la distanza residua.'}
          </Text>
        </View>
      ) : null}

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{formatDistance(distanceRemainingKm)}</Text>
          <Text style={styles.metricLabel}>Alla fine</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>
            {timeRemainingMinutes !== null ? formatDuration(timeRemainingMinutes * 60) : '--:--'}
          </Text>
          <Text style={styles.metricLabel}>Tempo Tutor</Text>
        </View>
      </View>

      <View style={styles.points}>
        <Text style={styles.pointText}>
          Ingresso: {formatCoordinate(segment.start_latitude, segment.start_longitude)}
        </Text>
        <Text style={styles.pointText}>
          Uscita: {formatCoordinate(segment.end_latitude, segment.end_longitude)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 214,
    left: 16,
    right: 16,
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 14,
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 12,
  },
  kicker: {
    color: '#8e8e93',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '800',
    marginBottom: 3,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  limit: {
    minWidth: 48,
    textAlign: 'center',
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    borderWidth: 3,
    borderColor: '#e74c3c',
    borderRadius: 24,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  speedsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  warningBox: {
    backgroundColor: 'rgba(231, 76, 60, 0.18)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  warningText: {
    color: '#ff8a80',
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  metric: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 10,
  },
  metricValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#8e8e93',
    fontSize: 12,
    marginTop: 2,
  },
  points: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 10,
    gap: 4,
  },
  pointText: {
    color: '#8e8e93',
    fontSize: 12,
  },
});
