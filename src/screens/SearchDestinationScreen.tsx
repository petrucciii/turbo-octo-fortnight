import React, { useState } from 'react';
import { View, TextInput, StyleSheet, FlatList, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { searchPlaces } from '../api/googlePlaces';
import { useNavigationStore } from '../store/navigationStore';
import { Place } from '../types/navigation';

export const SearchDestinationScreen = ({ navigation }: any) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const { setDestination } = useNavigationStore();

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length > 2) {
      const places = await searchPlaces(text);
      setResults(places);
    } else {
      setResults([]);
    }
  };

  const handleSelect = (place: Place) => {
    setDestination(place);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Indietro</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Cerca destinazione..."
          placeholderTextColor="#8e8e93"
          value={query}
          onChangeText={handleSearch}
          autoFocus
        />
      </View>
      <FlatList
        data={results}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item)}>
            <Text style={styles.resultName}>{item.name}</Text>
            <Text style={styles.resultAddress}>{item.address}</Text>
          </TouchableOpacity>
        )}
      />
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
    marginRight: 16,
  },
  backText: {
    color: '#3498db',
    fontSize: 16,
  },
  input: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  resultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  resultName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultAddress: {
    color: '#8e8e93',
    fontSize: 14,
  }
});
