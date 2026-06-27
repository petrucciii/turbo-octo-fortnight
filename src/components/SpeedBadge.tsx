import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  value: string;
  label: string;
  highlight?: boolean;
  color?: string;
}

export const SpeedBadge: React.FC<Props> = ({ value, label, highlight, color }) => {
  return (
    <View style={[styles.container, highlight && styles.highlight, color ? { borderColor: color } : null]}>
      <Text style={[styles.value, color ? { color } : null]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flex: 1,
    marginHorizontal: 4,
  },
  highlight: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  label: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
  }
});
