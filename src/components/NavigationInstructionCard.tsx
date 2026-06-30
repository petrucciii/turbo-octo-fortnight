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
        <View style={styles.recenterBadge}>
          <Text style={styles.recenterIcon}>◆</Text>
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
    left: 16,
    right: 16,
    backgroundColor: '#006b66',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 12,
  },
  warningContainer: {
    backgroundColor: '#7a4b00',
  },
  mainRow: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 14,
  },
  iconColumn: {
    width: 78,
    alignItems: 'center',
  },
  maneuverIcon: {
    color: '#fff',
    fontSize: 50,
    fontWeight: '900',
    lineHeight: 54,
  },
  distanceText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '500',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  recenterBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recenterIcon: {
    color: '#3b82f6',
    fontSize: 26,
    fontWeight: '900',
  },
  nextBox: {
    alignSelf: 'flex-start',
    maxWidth: '52%',
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#005550',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomRightRadius: 18,
  },
  nextLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  nextText: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
