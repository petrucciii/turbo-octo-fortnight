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

  if (type === 'roundabout' || type === 'rotary' || type === 'exit roundabout') return '\u27F3';
  if (type === 'arrive') return '\u25CF';
  if (modifier?.includes('left')) return '\u21B0';
  if (modifier?.includes('right')) return '\u21B1';
  if (modifier === 'uturn') return '\u21B6';
  if (type === 'fork') return '\u21C6';

  return '\u2191';
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
  const instructionText =
    instruction?.text && instruction.text.trim().length > 0
      ? instruction.text
      : 'Indicazione non disponibile';

  return (
    <View style={[styles.container, (isOffRoute || isRerouting) && styles.warningContainer]}>
      <View style={styles.mainRow}>
        <View style={styles.iconColumn}>
          <Text style={styles.maneuverIcon}>{getManeuverIcon(instruction)}</Text>
          <Text style={styles.distanceText}>{distanceText}</Text>
        </View>
        <View style={styles.textColumn}>
          <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
            {primaryText}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2} ellipsizeMode="tail">
            {instructionText}
          </Text>
        </View>
      </View>
      <View style={styles.nextBox}>
        <Text style={styles.nextLabel}>Poi</Text>
        <Text style={styles.nextText} numberOfLines={1}>
          {nextText}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 44,
    left: 18,
    right: 18,
    backgroundColor: 'rgba(10,18,32,0.9)',
    borderRadius: 20,
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
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 12,
  },
  iconColumn: {
    width: 50,
    alignItems: 'center',
  },
  maneuverIcon: {
    color: '#38BDF8',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  distanceText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
    lineHeight: 16,
  },
  nextBox: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(124,58,237,0.38)',
    paddingHorizontal: 12,
    paddingVertical: 6,
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
