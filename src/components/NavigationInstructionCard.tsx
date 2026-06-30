import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RouteInstruction } from '../types/navigation';
import { formatDistance } from '../utils/formatting';

interface Props {
  instruction: RouteInstruction | null;
  nextInstruction: RouteInstruction | null;
  currentRoadName: string | null;
  distanceToManeuverKm: number | null;
  isOffRoute: boolean;
  isRerouting: boolean;
}

const getManeuverIcon = (instruction: RouteInstruction | null): string => {
  const type = instruction?.maneuverType;
  const modifier = instruction?.modifier;

  if (type === 'roundabout' || type === 'rotary' || type === 'exit roundabout') return '⟳';
  if (type === 'arrive') return '●';
  if (modifier?.includes('left')) return '↰';
  if (modifier?.includes('right')) return '↱';
  if (modifier === 'uturn') return '↶';
  if (type === 'fork') return '⇆';

  return '↑';
};

const getPrimaryText = (
  instruction: RouteInstruction | null,
  currentRoadName: string | null,
  isOffRoute: boolean,
  isRerouting: boolean
): string => {
  if (isRerouting) return 'Ricalcolo percorso...';
  if (isOffRoute) return 'Torna verso il percorso';

  const streetName = instruction?.streetName || currentRoadName;
  if (streetName && streetName.trim().length > 0) return streetName;
  if (instruction?.text && instruction.text.trim().length > 0) return instruction.text;

  return 'Prosegui sul percorso';
};

export const NavigationInstructionCard: React.FC<Props> = ({
  instruction,
  nextInstruction,
  currentRoadName,
  distanceToManeuverKm,
  isOffRoute,
  isRerouting,
}) => {
  const primaryText = getPrimaryText(instruction, currentRoadName, isOffRoute, isRerouting);
  const distanceText =
    distanceToManeuverKm !== null && Number.isFinite(distanceToManeuverKm)
      ? formatDistance(distanceToManeuverKm)
      : '--';
  const nextText =
    nextInstruction?.text && nextInstruction.text.trim().length > 0
      ? nextInstruction.text
      : 'Segui il percorso';

  return (
    <View style={[styles.container, (isOffRoute || isRerouting) && styles.warningContainer]}>
      <View style={styles.mainRow}>
        <View style={styles.iconColumn}>
          <Text style={styles.maneuverIcon}>{getManeuverIcon(instruction)}</Text>
          <Text style={styles.distanceText}>{distanceText}</Text>
        </View>
        <View style={styles.textColumn}>
          <Text style={styles.title} numberOfLines={1}>{primaryText}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {instruction?.text || 'Indicazione non disponibile'}
          </Text>
        </View>
      </View>
      <View style={styles.nextBox}>
        <Text style={styles.nextLabel}>Poi</Text>
        <Text style={styles.nextText} numberOfLines={1}>{nextText}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 46,
    left: 14,
    right: 74,
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.24)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 12,
  },
  warningContainer: {
    backgroundColor: 'rgba(120,53,15,0.9)',
  },
  mainRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  iconColumn: {
    width: 54,
    alignItems: 'center',
  },
  maneuverIcon: {
    color: '#38BDF8',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 54,
  },
  distanceText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 21,
    fontWeight: '800',
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  nextBox: {
    alignSelf: 'flex-start',
    maxWidth: '72%',
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(124,58,237,0.48)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomRightRadius: 18,
  },
  nextLabel: {
    color: '#EDE9FE',
    fontSize: 13,
    fontWeight: '900',
  },
  nextText: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },
});
