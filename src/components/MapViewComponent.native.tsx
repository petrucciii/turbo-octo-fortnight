import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { RouteInfo, Coordinate } from '../types/navigation';
import { TutorSegment } from '../types/tutor';

interface Props {
  userLocation: Coordinate | null;
  origin: Coordinate | null;
  route: RouteInfo | null;
  tutorSegments: TutorSegment[];
  activeTutorSegment: TutorSegment | null;
  destination: Coordinate | null;
  heading: number | null;
  isNavigating: boolean;
}

const customMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
];

export const MapViewComponent: React.FC<Props> = ({
  userLocation,
  origin,
  route,
  tutorSegments,
  activeTutorSegment,
  destination,
  heading,
  isNavigating,
}) => {
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (!mapRef.current || !route || route.polyline.length < 2 || isNavigating) return;

    const coordinates = [
      ...route.polyline,
      ...(origin ? [origin] : []),
      ...(destination ? [destination] : []),
    ];

    setTimeout(() => {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 120, right: 48, bottom: 280, left: 48 },
        animated: true,
      });
    }, 250);
  }, [route, origin, destination, isNavigating]);

  useEffect(() => {
    if (!mapRef.current || !userLocation || !isNavigating) return;

    mapRef.current.animateCamera(
      {
        center: userLocation,
        pitch: 58,
        heading: heading ?? 0,
        zoom: 17,
      },
      { duration: 700 }
    );
  }, [userLocation, heading, isNavigating]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={customMapStyle}
        initialRegion={{
          latitude: userLocation?.latitude || origin?.latitude || 41.9028,
          longitude: userLocation?.longitude || origin?.longitude || 12.4964,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
        followsUserLocation={isNavigating}
        showsCompass
        showsMyLocationButton={false}
        rotateEnabled
        pitchEnabled
      >
        {route ? (
          <Polyline
            coordinates={route.polyline}
            strokeColor="#3498db"
            strokeWidth={6}
          />
        ) : null}

        {origin ? (
          <Marker coordinate={origin} title="Partenza" pinColor="#2ecc71" />
        ) : null}

        {destination ? (
          <Marker coordinate={destination} title="Destinazione" pinColor="#e74c3c" />
        ) : null}

        {tutorSegments.map((segment) => {
          const isActive = activeTutorSegment?.id === segment.id;
          const start = { latitude: segment.start_latitude, longitude: segment.start_longitude };
          const end = { latitude: segment.end_latitude, longitude: segment.end_longitude };

          return (
            <React.Fragment key={segment.id}>
              <Polyline
                coordinates={[start, end]}
                strokeColor={isActive ? '#2ecc71' : '#f39c12'}
                strokeWidth={isActive ? 6 : 4}
                lineDashPattern={isActive ? undefined : [10, 8]}
              />
              <Marker
                coordinate={start}
                title={`Inizio Tutor ${segment.highway_name}`}
                description={segment.name}
                pinColor={isActive ? '#2ecc71' : '#f39c12'}
              />
              <Marker
                coordinate={end}
                title={`Fine Tutor ${segment.highway_name}`}
                description={segment.name}
                pinColor={isActive ? '#e74c3c' : '#f39c12'}
              />
            </React.Fragment>
          );
        })}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
