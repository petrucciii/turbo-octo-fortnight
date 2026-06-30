import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { RouteInfo, Coordinate, MapDisplayType } from '../types/navigation';
import { TutorSegment } from '../types/tutor';
import { projectCoordinate } from '../utils/motion';
import { ManeuverRouteCue } from '../utils/routeArrows';
import { UserPositionArrow } from './UserPositionArrow';
import { TutorMapMarker } from './TutorMapMarker';

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
  overlayResetKey: number;
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

const isValidCoordinate = (coordinate: Coordinate | null): coordinate is Coordinate => {
  return Boolean(
    coordinate &&
      Number.isFinite(coordinate.latitude) &&
      Number.isFinite(coordinate.longitude)
  );
};

const getSafeHeading = (heading: number | null, fallback = 0): number => {
  return typeof heading === 'number' && Number.isFinite(heading) ? heading : fallback;
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
  overlayResetKey,
  followUserLocation,
  recenterRequestId,
  onUserGesture,
}) => {
  const mapRef = useRef<MapView | null>(null);
  const hasCenteredInitialLocationRef = useRef(false);
  const [lastRenderableUserLocation, setLastRenderableUserLocation] = useState<Coordinate | null>(
    isValidCoordinate(userLocation) ? userLocation : null
  );
  const [lastRenderableHeading, setLastRenderableHeading] = useState<number | null>(
    typeof heading === 'number' && Number.isFinite(heading) ? heading : null
  );
  const visibleUserLocation = isValidCoordinate(userLocation) ? userLocation : lastRenderableUserLocation;
  const safeHeading = getSafeHeading(heading, lastRenderableHeading ?? 0);
  const cameraHeading = typeof heading === 'number' && Number.isFinite(heading)
    ? safeHeading
    : lastRenderableHeading;
  const routeKey = route
    ? `${overlayResetKey}-${route.polyline.length}-${route.distanceKm.toFixed(3)}-${destination?.latitude ?? 'no-dest'}-${destination?.longitude ?? 'no-dest'}`
    : `no-route-${overlayResetKey}`;
  const headingKey = Math.round(safeHeading);
  const userMarkerKey = visibleUserLocation
    ? `user-marker-${overlayResetKey}-${visibleUserLocation.latitude.toFixed(6)}-${visibleUserLocation.longitude.toFixed(6)}-${headingKey}`
    : `user-marker-empty-${overlayResetKey}`;

  const animateToUser = (duration = 700) => {
    if (!mapRef.current || !visibleUserLocation) return;

    mapRef.current.animateCamera(
      {
        center: getCameraCenter(visibleUserLocation, cameraHeading),
        pitch: isNavigating ? 58 : 0,
        heading: isNavigating ? safeHeading : 0,
        zoom: isNavigating ? 18 : 15,
      },
      { duration }
    );
  };

  useEffect(() => {
    if (isValidCoordinate(userLocation)) {
      setLastRenderableUserLocation(userLocation);
    }
  }, [userLocation?.latitude, userLocation?.longitude]);

  useEffect(() => {
    if (typeof heading === 'number' && Number.isFinite(heading)) {
      setLastRenderableHeading(heading);
    }
  }, [heading]);

  useEffect(() => {
    console.log('MAP USER MARKER', {
      visibleUserLocation,
      isNavigating,
      hasRoute: Boolean(route),
    });
  }, [visibleUserLocation, isNavigating, route]);

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
    if (hasCenteredInitialLocationRef.current || !visibleUserLocation || route) return;
    hasCenteredInitialLocationRef.current = true;
    animateToUser(650);
  }, [visibleUserLocation, route]);

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
          latitude: visibleUserLocation?.latitude || origin?.latitude || 41.9028,
          longitude: visibleUserLocation?.longitude || origin?.longitude || 12.4964,
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
          <React.Fragment key={routeKey}>
            <Polyline
              key={`route-outline-${routeKey}`}
              coordinates={route.polyline}
              strokeColor="rgba(255,255,255,0.92)"
              strokeWidth={9}
              zIndex={1}
            />
            <Polyline
              key={`route-main-${routeKey}`}
              coordinates={route.polyline}
              strokeColor="#7C3AED"
              strokeWidth={5}
              zIndex={2}
            />
            {maneuverCue?.section && maneuverCue.section.length > 1 ? (
              <Polyline
                key={`route-cue-${routeKey}-${maneuverCue.id}`}
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
          </React.Fragment>
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
            <React.Fragment key={`${overlayResetKey}-${segment.id}`}>
              <Polyline
                key={`tutor-line-${overlayResetKey}-${segment.id}`}
                coordinates={[start, end]}
                strokeColor={isActive ? '#22D3EE' : '#F97316'}
                strokeWidth={isActive ? 8 : 6}
                zIndex={4}
              />
              <Marker
                coordinate={start}
                title={`Inizio Tutor ${segment.highway_name}`}
                description={segment.name}
                anchor={{ x: 0.5, y: 0.9 }}
                zIndex={6}
              >
                <TutorMapMarker type="start" active={isActive} />
              </Marker>
              <Marker
                coordinate={end}
                title={`Fine Tutor ${segment.highway_name}`}
                description={segment.name}
                anchor={{ x: 0.5, y: 0.9 }}
                zIndex={6}
              >
                <TutorMapMarker type="end" active={isActive} />
              </Marker>
            </React.Fragment>
          );
        })}

        {visibleUserLocation ? (
          <Marker
            key={userMarkerKey}
            coordinate={visibleUserLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={9999}
            flat
            tracksViewChanges
          >
            <UserPositionArrow heading={safeHeading} />
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
});
