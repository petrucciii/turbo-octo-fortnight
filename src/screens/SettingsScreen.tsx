import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettingsStore } from '../store/settingsStore';

export const SettingsScreen = ({ navigation }: any) => {
  const { voiceAlertsEnabled, vibrationEnabled, setVoiceAlertsEnabled, setVibrationEnabled } = useSettingsStore();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>Chiudi</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Impostazioni</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avvisi e Notifiche</Text>
          
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Avvisi Vocali</Text>
            <Switch 
              value={voiceAlertsEnabled} 
              onValueChange={setVoiceAlertsEnabled}
              trackColor={{ false: '#333', true: '#3498db' }}
            />
          </View>
          
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Vibrazione</Text>
            <Switch 
              value={vibrationEnabled} 
              onValueChange={setVibrationEnabled}
              trackColor={{ false: '#333', true: '#3498db' }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tema</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Tema Scuro Premium</Text>
            <Switch value={true} disabled trackColor={{ true: '#3498db' }} />
          </View>
        </View>

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerTitle}>Disclaimer di Sicurezza</Text>
          <Text style={styles.disclaimerText}>
            TutorSafe Navigator è un assistente informativo alla guida. Il conducente resta sempre responsabile del rispetto del Codice della Strada, della segnaletica, dei limiti di velocità e delle condizioni reali del traffico. L'app non sostituisce attenzione, prudenza e responsabilità. Non frenare bruscamente e guida sempre in modo sicuro.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backBtn: {
    color: '#3498db',
    fontSize: 16,
    marginRight: 20,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  rowLabel: {
    color: '#fff',
    fontSize: 16,
  },
  disclaimerBox: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.3)',
    marginTop: 20,
    marginBottom: 40,
  },
  disclaimerTitle: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  disclaimerText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  }
});
