import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { RouteInfo, Coordinate, MapDisplayType } from '../types/navigation';
import { TutorSegment } from '../types/tutor';
import { projectCoordinate } from '../utils/motion';
import { ManeuverRouteCue } from '../utils/routeArrows';

interface Props {
  userLocation: Coordinate | null;
  origin: Coordinate | null;
  route: RouteInfo | null;
  tutorSegments: TutorSegment[];
  activeTutorSegment: TutorSegment | null;
  destination: Coordinate | null;
  heading: number | null;
  isNavigating: boolean;
  mapType: MapDisplayType;
  maneuverCue: ManeuverRouteCue | null;
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
  mapType,
  maneuverCue,
  followUserLocation,
  recenterRequestId,
  onUserGesture,
}) => {
  const mapRef = useRef<MapView | null>(null);
  const hasCenteredInitialLocationRef = useRef(false);

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
    if (hasCenteredInitialLocationRef.current || !userLocation || route) return;
    hasCenteredInitialLocationRef.current = true;
    animateToUser(650);
  }, [userLocation, route]);

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
        mapType={mapType}
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
              strokeColor="rgba(255,255,255,0.92)"
              strokeWidth={9}
              zIndex={1}
            />
            <Polyline
              coordinates={route.polyline}
              strokeColor="#7C3AED"
              strokeWidth={5}
              zIndex={2}
            />
            {maneuverCue?.section && maneuverCue.section.length > 1 ? (
              <Polyline
                coordinates={maneuverCue.section}
                strokeColor="#22D3EE"
                strokeWidth={7}
                zIndex={3}
              />
            ) : null}
            {maneuverCue?.arrow ? (
              <Marker
                key={maneuverCue.arrow.id}
                coordinate={maneuverCue.arrow.coordinate}
                anchor={{ x: 0.5, y: 0.5 }}
                zIndex={4}
              >
                <View style={[styles.routeArrow, { transform: [{ rotate: `${maneuverCue.arrow.heading}deg` }] }]} />
              </Marker>
            ) : null}
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
            <View style={[styles.userArrowShell, { transform: [{ rotate: `${heading ?? 0}deg` }] }]}>
              <View style={styles.userArrow} />
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
  userArrowShell: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(17,24,39,0.72)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
    justifyContent: 'center',
  },
  userArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 22,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#38BDF8',
    transform: [{ translateY: -2 }],
  },
  routeArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 17,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#22D3EE',
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
