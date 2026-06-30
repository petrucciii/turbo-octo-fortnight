import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
  distanceTravelledKm?: number;
  elapsedSeconds?: number | null;
  compact?: boolean;
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
  timeRemainingMinutes,
  status,
  distanceTravelledKm,
  elapsedSeconds,
  compact = false,
}) => {
  const isOverLimit = status === 'over_limit';
  const isWarning = status === 'warning';
  const hasRecommendedSpeed = recommendedSpeedKmh !== null && Number.isFinite(recommendedSpeedKmh);
  const recommendedLabel = hasRecommendedSpeed
    ? `${formatSpeed(recommendedSpeedKmh)} km/h`
    : 'Rallenta in sicurezza';
  const elapsedLabel =
    typeof elapsedSeconds === 'number' && Number.isFinite(elapsedSeconds)
      ? formatDuration(elapsedSeconds)
      : null;
  const remainingTimeLabel =
    typeof timeRemainingMinutes === 'number' && Number.isFinite(timeRemainingMinutes) && timeRemainingMinutes > 0
      ? timeRemainingMinutes < 1
        ? '<1 min'
        : `${Math.round(timeRemainingMinutes)} min`
      : null;

  return (
    <View style={[styles.container, compact && styles.containerCompact, isOverLimit && styles.containerAlert, isWarning && styles.containerWarning]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Tutor attivo</Text>
          {!compact ? <Text style={styles.title} numberOfLines={2}>{segment.name}</Text> : null}
        </View>
        <View style={[styles.statusPill, isOverLimit && styles.statusPillAlert, isWarning && styles.statusPillWarning]}>
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
        {!compact && typeof distanceTravelledKm === 'number' ? (
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{formatDistance(distanceTravelledKm)}</Text>
            <Text style={styles.metricLabel}>Percorsi</Text>
          </View>
        ) : null}
        {!compact && elapsedLabel ? (
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{elapsedLabel}</Text>
            <Text style={styles.metricLabel}>Tempo</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.recommendation, isOverLimit && styles.recommendationAlert]}>
        <Text style={styles.recommendationLabel}>Velocita consigliata</Text>
        <Text style={styles.recommendationValue}>{recommendedLabel}</Text>
      </View>

      <Text style={[styles.warningText, !isOverLimit && styles.safeText]}>
        {isOverLimit
          ? 'Media sopra limite: riduci gradualmente e resta prudente.'
          : isWarning
            ? 'Media vicina al limite: mantieni una velocita regolare.'
            : 'Media sotto controllo.'}
        {remainingTimeLabel ? ` Fine stimata tra ${remainingTimeLabel}.` : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 154,
    left: 18,
    right: 18,
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
  containerCompact: {
    top: 86,
    left: 16,
    right: 16,
    padding: 10,
    borderRadius: 14,
  },
  containerAlert: {
    borderColor: '#FB503B',
  },
  containerWarning: {
    borderColor: '#F59E0B',
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
    maxWidth: 220,
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
  statusPillWarning: {
    backgroundColor: 'rgba(245,158,11,0.22)',
  },
  statusText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '900',
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metric: {
    minWidth: 58,
    flexGrow: 1,
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
    marginTop: 8,
    lineHeight: 16,
  },
  safeText: {
    color: '#BAE6FD',
  },
  recommendation: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  recommendationAlert: {
    backgroundColor: 'rgba(251,146,60,0.14)',
    borderColor: 'rgba(251,146,60,0.38)',
  },
  recommendationLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '800',
  },
  recommendationValue: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '900',
  },
});
