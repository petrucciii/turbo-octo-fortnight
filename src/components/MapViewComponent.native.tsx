import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { RouteInfo, Coordinate } from '../types/navigation';
import { TutorSegment } from '../types/tutor';

interface Props {
  userLocation: Coordinate | null;
  route: RouteInfo | null;
  tutorSegments: TutorSegment[];
  activeTutorSegment: TutorSegment | null;
  destination: Coordinate | null;
}

const customMapStyle = [
  { "elementType": "geometry", "stylers": [{"color": "#242f3e"}] },
  { "elementType": "labels.text.fill", "stylers": [{"color": "#746855"}] },
  { "elementType": "labels.text.stroke", "stylers": [{"color": "#242f3e"}] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{"color": "#d59563"}] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{"color": "#38414e"}] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{"color": "#212a37"}] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{"color": "#9ca5b3"}] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{"color": "#746855"}] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{"color": "#1f2835"}] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{"color": "#f3d19c"}] },
];

import { Platform, Text } from 'react-native';

export const MapViewComponent: React.FC<Props> = ({ 
  userLocation, 
  route, 
  tutorSegments,
  activeTutorSegment,
  destination
}) => {
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { justifyContent: 'center', backgroundColor: '#242f3e' }]}>
        <Text style={{ color: '#fff', fontSize: 18, textAlign: 'center', padding: 20 }}>
          La mappa interattiva nativa non è visibile sul browser del computer.
        </Text>
        <Text style={{ color: '#3498db', fontSize: 16, textAlign: 'center', padding: 20 }}>
          Apri l'app dal tuo telefono usando Expo Go per vedere la mappa reale!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={customMapStyle}
        initialRegion={{
          latitude: userLocation?.latitude || 41.9028,
          longitude: userLocation?.longitude || 12.4964,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        region={userLocation ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        } : undefined}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {route && (
          <Polyline
            coordinates={route.polyline}
            strokeColor="#3498db"
            strokeWidth={5}
          />
        )}

        {destination && (
          <Marker coordinate={destination} title="Destinazione" />
        )}

        {tutorSegments.map(segment => (
          <React.Fragment key={segment.id}>
            <Marker 
              coordinate={{ latitude: segment.start_latitude, longitude: segment.start_longitude }}
              title="Inizio zona a velocità media"
              pinColor={activeTutorSegment?.id === segment.id ? 'green' : 'blue'}
            />
            <Marker 
              coordinate={{ latitude: segment.end_latitude, longitude: segment.end_longitude }}
              title="Fine zona a velocità media"
              pinColor={activeTutorSegment?.id === segment.id ? 'red' : 'blue'}
            />
          </React.Fragment>
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
