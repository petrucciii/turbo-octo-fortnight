import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  isNominatimNetworkError,
  isNominatimRateLimitError,
  searchPlaces,
} from '../api/googlePlaces';
import { useLocationStore } from '../store/locationStore';
import { useNavigationStore } from '../store/navigationStore';
import { Coordinate, Place } from '../types/navigation';
import type { RootStackParamList } from '../types/routes';

type SearchStatus =
  | 'idle'
  | 'typing'
  | 'searching'
  | 'success'
  | 'empty'
  | 'rate-limited'
  | 'network-error';

const SEARCH_DEBOUNCE_MS = 650;

const normalizeQuery = (query: string): string => query.trim().toLowerCase().replace(/\s+/g, ' ');

const getRoundedCoordinate = (coordinate: Coordinate | null): string => {
  if (!coordinate) return 'no-location';
  return `${coordinate.latitude.toFixed(2)},${coordinate.longitude.toFixed(2)}`;
};

const getSearchKey = (query: string, coordinate: Coordinate | null): string => {
  return `${normalizeQuery(query)}-${getRoundedCoordinate(coordinate)}`;
};

const getStatusMessage = (status: SearchStatus, hasQuery: boolean): string | null => {
  if (!hasQuery || status === 'idle' || status === 'success' || status === 'searching') return null;
  if (status === 'typing') return 'Scrivi almeno 3 lettere.';
  if (status === 'empty') return 'Nessun risultato trovato vicino a te.';
  if (status === 'rate-limited') return 'Ricerca temporaneamente limitata. Attendi qualche secondo e riprova.';
  if (status === 'network-error') return 'Problema di connessione. Riprova.';
  return null;
};

type Props = NativeStackScreenProps<RootStackParamList, 'SearchDestination'>;

export const SearchDestinationScreen = ({ navigation, route }: Props) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const searchRequestIdRef = useRef(0);
  const lastSearchedKeyRef = useRef<string | null>(null);
  const { setDestination, setOrigin, setRoute } = useNavigationStore();
  const { currentLocation, lastKnownLocation } = useLocationStore();
  const mode = route.params?.mode === 'origin' ? 'origin' : 'destination';
  const title = mode === 'origin' ? 'Scegli punto di partenza' : 'Cerca destinazione';

  useEffect(() => {
    const trimmedQuery = query.trim();
    searchRequestIdRef.current += 1;
    lastSearchedKeyRef.current = null;
    setErrorMessage(null);

    if (trimmedQuery.length === 0) {
      setResults([]);
      setIsSearching(false);
      setSearchStatus('idle');
      return;
    }

    if (trimmedQuery.length < 3) {
      setResults([]);
      setIsSearching(false);
      setSearchStatus('typing');
      return;
    }

    setSearchStatus('typing');
  }, [query]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const trimmedQuery = debouncedQuery.trim();

    if (trimmedQuery.length === 0) {
      searchRequestIdRef.current += 1;
      lastSearchedKeyRef.current = null;
      setResults([]);
      setIsSearching(false);
      setSearchStatus('idle');
      setErrorMessage(null);
      return;
    }

    if (trimmedQuery.length < 3) {
      searchRequestIdRef.current += 1;
      lastSearchedKeyRef.current = null;
      setResults([]);
      setIsSearching(false);
      setSearchStatus('typing');
      setErrorMessage(null);
      return;
    }

    const searchLocation = currentLocation?.coordinate ?? lastKnownLocation?.coordinate ?? null;
    const searchKey = getSearchKey(trimmedQuery, searchLocation);
    if (searchKey === lastSearchedKeyRef.current) return;

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    lastSearchedKeyRef.current = searchKey;

    const runSearch = async () => {
      setIsSearching(true);
      setSearchStatus('searching');
      setErrorMessage(null);

      try {
        const places = await searchPlaces(trimmedQuery, searchLocation);
        if (searchRequestIdRef.current !== requestId) return;

        setResults(places);
        setSearchStatus(places.length > 0 ? 'success' : 'empty');
      } catch (error) {
        if (searchRequestIdRef.current !== requestId) return;

        setResults([]);
        lastSearchedKeyRef.current = null;
        if (isNominatimRateLimitError(error)) {
          setSearchStatus('rate-limited');
          setErrorMessage('Ricerca temporaneamente limitata. Attendi qualche secondo e riprova.');
        } else if (isNominatimNetworkError(error)) {
          setSearchStatus('network-error');
          setErrorMessage('Problema di connessione. Riprova.');
        } else {
          setSearchStatus('network-error');
          setErrorMessage('Errore ricerca. Riprova.');
        }
      } finally {
        if (searchRequestIdRef.current === requestId) {
          setIsSearching(false);
        }
      }
    };

    void runSearch();
  }, [debouncedQuery, currentLocation?.coordinate, lastKnownLocation?.coordinate]);

  const handleSelect = (place: Place) => {
    setRoute(null);
    if (mode === 'origin') {
      setOrigin(place);
    } else {
      setDestination(place);
    }
    navigation.goBack();
  };

  const getAddressText = (place: Place): string => {
    if (typeof place.distanceKm !== 'number' || !Number.isFinite(place.distanceKm)) return place.address;
    const distanceText = place.distanceKm < 1
      ? `${Math.round(place.distanceKm * 1000)} m`
      : `${Math.round(place.distanceKm)} km`;
    return `${place.address} - ${distanceText}`;
  };

  const statusMessage = errorMessage ?? getStatusMessage(searchStatus, query.trim().length > 0);

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
          onChangeText={setQuery}
          autoFocus
        />
      </View>
      <FlatList
        data={results}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item)}>
            <Text style={styles.resultName}>{item.name}</Text>
            <Text style={styles.resultAddress}>{getAddressText(item)}</Text>
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
          !isSearching && statusMessage ? (
            <Text style={styles.emptyText}>{statusMessage}</Text>
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
    lineHeight: 20,
  }
});
