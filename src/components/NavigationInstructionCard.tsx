import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  instruction: string | null;
  nextInstruction: string | null;
  currentRoadName: string | null;
  isOffRoute: boolean;
  isRerouting: boolean;
}

export const NavigationInstructionCard: React.FC<Props> = ({
  instruction,
  nextInstruction,
  currentRoadName,
  isOffRoute,
  isRerouting,
}) => {
  const title = isRerouting
    ? 'Ricalcolo percorso...'
    : isOffRoute
      ? 'Sei fuori dal percorso'
      : instruction || 'Procedi verso la destinazione';

  return (
    <View style={[styles.container, (isOffRoute || isRerouting) && styles.warningContainer]}>
      <Text style={styles.title}>{title}</Text>
      {currentRoadName && !isOffRoute && !isRerouting ? (
        <Text style={styles.road}>Ora su {currentRoadName}</Text>
      ) : null}
      {nextInstruction && !isOffRoute && !isRerouting ? (
        <Text style={styles.next}>Poi: {nextInstruction}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  warningContainer: {
    borderColor: '#f39c12',
  },
  title: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '800',
  },
  road: {
    color: '#8e8e93',
    fontSize: 13,
    marginTop: 6,
  },
  next: {
    color: '#3498db',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
});
