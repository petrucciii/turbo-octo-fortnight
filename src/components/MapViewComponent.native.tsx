import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { RouteInfo, Coordinate } from '../types/navigation';
import { TutorSegment } from '../types/tutor';
import { projectCoordinate } from '../utils/motion';

interface Props {
  userLocation: Coordinate | null;
  origin: Coordinate | null;
  route: RouteInfo | null;
  tutorSegments: TutorSegment[];
  activeTutorSegment: TutorSegment | null;
  destination: Coordinate | null;
  heading: number | null;
  isNavigating: boolean;
  followUserLocation: boolean;
  recenterRequestId: number;
  onUserGesture: () => void;
}

const customMapStyle = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#2b2b2b' }, { weight: 3 }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f5d271' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'water', stylers: [{ color: '#4f8faa' }] },
];

const getCameraCenter = (coordinate: Coordinate, heading: number | null): Coordinate => {
  if (heading === null) return coordinate;
  return projectCoordinate(coordinate, heading, 72);
};

export const MapViewComponent: React.FC<Props> = ({
  userLocation,
  origin,
  route,
  tutorSegments,
  activeTutorSegment,
  destination,
  heading,
  isNavigating,
  followUserLocation,
  recenterRequestId,
  onUserGesture,
}) => {
  const mapRef = useRef<MapView | null>(null);

  const animateToUser = (duration = 700) => {
    if (!mapRef.current || !userLocation) return;

    mapRef.current.animateCamera(
      {
        center: getCameraCenter(userLocation, heading),
        pitch: isNavigating ? 58 : 0,
        heading: isNavigating ? heading ?? 0 : 0,
        zoom: isNavigating ? 18 : 15,
      },
      { duration }
    );
  };

  useEffect(() => {
    if (!mapRef.current || !route || route.polyline.length < 2 || isNavigating) return;

    const coordinates = [
      ...route.polyline,
      ...(origin ? [origin] : []),
      ...(destination ? [destination] : []),
    ];

    setTimeout(() => {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 130, right: 52, bottom: 300, left: 52 },
        animated: true,
      });
    }, 250);
  }, [route, origin, destination, isNavigating]);

  useEffect(() => {
    if (!isNavigating || !followUserLocation) return;
    animateToUser();
  }, [userLocation, heading, isNavigating, followUserLocation]);

  useEffect(() => {
    animateToUser(500);
  }, [recenterRequestId]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={customMapStyle}
        mapType={isNavigating ? 'hybrid' : 'standard'}
        initialRegion={{
          latitude: userLocation?.latitude || origin?.latitude || 41.9028,
          longitude: userLocation?.longitude || origin?.longitude || 12.4964,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={false}
        showsCompass={false}
        showsMyLocationButton={false}
        rotateEnabled
        pitchEnabled
        onPanDrag={() => {
          if (isNavigating) onUserGesture();
        }}
      >
        {route ? (
          <>
            <Polyline
              coordinates={route.polyline}
              strokeColor="#ffffff"
              strokeWidth={11}
              zIndex={1}
            />
            <Polyline
              coordinates={route.polyline}
              strokeColor="#1b2cff"
              strokeWidth={7}
              zIndex={2}
            />
          </>
        ) : null}

        {origin && !isNavigating ? (
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
                strokeColor={isActive ? '#00c853' : '#ff8f00'}
                strokeWidth={isActive ? 9 : 7}
                zIndex={4}
              />
              <Marker
                coordinate={start}
                title={`Inizio Tutor ${segment.highway_name}`}
                description={segment.name}
                pinColor={isActive ? '#00c853' : '#ff8f00'}
              />
              <Marker
                coordinate={end}
                title={`Fine Tutor ${segment.highway_name}`}
                description={segment.name}
                pinColor={isActive ? '#e53935' : '#ff8f00'}
              />
              <Marker coordinate={start} anchor={{ x: 0.5, y: 1.4 }}>
                <View style={styles.tutorLabel}>
                  <Text style={styles.tutorLabelText}>Tutor</Text>
                </View>
              </Marker>
            </React.Fragment>
          );
        })}

        {userLocation ? (
          <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }} zIndex={1000}>
            <View style={[styles.vehicleMarker, { transform: [{ rotate: `${heading ?? 0}deg` }] }]}>
              <View style={styles.vehicleArrow} />
              <View style={styles.vehicleBody}>
                <View style={styles.vehicleWindow} />
                <View style={styles.vehicleTail} />
              </View>
            </View>
          </Marker>
        ) : null}
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
  },
  map: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  vehicleMarker: {
    width: 42,
    height: 52,
    alignItems: 'center',
  },
  vehicleArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#2f6fff',
    marginBottom: -2,
  },
  vehicleBody: {
    width: 32,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#f8fbff',
    borderWidth: 3,
    borderColor: '#2f6fff',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.32,
    shadowRadius: 4,
    elevation: 8,
  },
  vehicleWindow: {
    width: 18,
    height: 10,
    borderRadius: 4,
    backgroundColor: '#cfe8ff',
  },
  vehicleTail: {
    width: 20,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#d92d20',
  },
  tutorLabel: {
    backgroundColor: '#ff8f00',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  tutorLabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
});
