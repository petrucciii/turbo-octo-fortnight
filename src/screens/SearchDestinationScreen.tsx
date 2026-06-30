import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { searchPlaces } from '../api/googlePlaces';
import { useLocationStore } from '../store/locationStore';
import { useNavigationStore } from '../store/navigationStore';
import { Place } from '../types/navigation';

export const SearchDestinationScreen = ({ navigation, route }: any) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { setDestination, setOrigin, setRoute } = useNavigationStore();
  const { currentLocation } = useLocationStore();
  const mode: 'origin' | 'destination' = route?.params?.mode === 'origin' ? 'origin' : 'destination';
  const title = mode === 'origin' ? 'Scegli punto di partenza' : 'Cerca destinazione';

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length > 2) {
      setIsSearching(true);
      try {
        const places = await searchPlaces(text, currentLocation?.coordinate ?? null);
        setResults(places);
      } finally {
        setIsSearching(false);
      }
    } else {
      setResults([]);
      setIsSearching(false);
    }
  };

  const handleSelect = (place: Place) => {
    setRoute(null);
    if (mode === 'origin') {
      setOrigin(place);
    } else {
      setDestination(place);
    }
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
          placeholder={title}
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
        ListHeaderComponent={
          isSearching ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#3498db" />
              <Text style={styles.loadingText}>Ricerca in corso...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          query.length > 2 && !isSearching ? (
            <Text style={styles.emptyText}>Nessun risultato trovato.</Text>
          ) : null
        }
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
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
  },
  loadingText: {
    color: '#8e8e93',
    fontSize: 14,
  },
  emptyText: {
    color: '#8e8e93',
    padding: 16,
    fontSize: 14,
  }
});
