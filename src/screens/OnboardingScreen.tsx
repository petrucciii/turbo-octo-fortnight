import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const pages = [
  {
    title: 'Naviga normalmente',
    text: 'Cerca una destinazione e segui il percorso come in un navigatore classico.'
  },
  {
    title: 'TutorSafe si attiva da solo',
    text: 'Quando entri in una tratta a velocità media, l’app riconosce automaticamente il tratto e calcola la tua media.'
  },
  {
    title: 'Guida entro i limiti',
    text: 'Se la tua media è troppo alta, TutorSafe ti indica la velocità consigliata per rientrare nel limite in sicurezza.'
  }
];

export const OnboardingScreen = ({ navigation }: any) => {
  const [currentPage, setCurrentPage] = useState(0);

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      navigation.replace('HomeMap');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{pages[currentPage].title}</Text>
        <Text style={styles.text}>{pages[currentPage].text}</Text>
      </View>
      <View style={styles.dots}>
        {pages.map((_, i) => (
          <View key={i} style={[styles.dot, i === currentPage && styles.dotActive]} />
        ))}
      </View>
      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>{currentPage === pages.length - 1 ? 'Inizia' : 'Avanti'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    padding: 20,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#3498db',
    width: 24,
  },
  button: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
