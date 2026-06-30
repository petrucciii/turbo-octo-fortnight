import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { RouteInfo, Coordinate, MapDisplayType } from '../types/navigation';
import { TutorSegment } from '../types/tutor';
import { projectCoordinate, smoothHeading } from '../utils/motion';
import { ManeuverRouteCue } from '../utils/routeArrows';
import type { RouteTutorMatch } from '../utils/routeProgress';
import { splitRouteByTutorMatches } from '../utils/routeGeometry';
import { UserPositionArrow } from './UserPositionArrow';
import { TutorMapMarker } from './TutorMapMarker';

interface Props {
  userLocation: Coordinate | null;
  origin: Coordinate | null;
  route: RouteInfo | null;
  tutorSegments: TutorSegment[];
  tutorMatches: RouteTutorMatch[];
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

const UserLocationLayer = React.memo(
  ({
    coordinate,
    heading,
  }: {
    coordinate: Coordinate;
    heading: number;
  }) => {
    console.log('USER LOCATION LAYER RENDER', {
      coordinate,
      heading,
    });

    return (
      <Marker
        identifier="user-location-permanent"
        coordinate={coordinate}
        anchor={{ x: 0.5, y: 0.5 }}
        zIndex={99999}
        tracksViewChanges
      >
        <UserPositionArrow heading={heading} isNavigating={false} />
      </Marker>
    );
  }
);

export const MapViewComponent: React.FC<Props> = ({
  userLocation,
  origin,
  route,
  tutorSegments,
  tutorMatches,
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
  const safeHeading = getSafeHeading(lastRenderableHeading, 0);
  const cameraHeading = lastRenderableHeading;
  const routeKey = route
    ? `${overlayResetKey}-${route.polyline.length}-${route.distanceKm.toFixed(3)}-${destination?.latitude ?? 'no-dest'}-${destination?.longitude ?? 'no-dest'}`
    : `no-route-${overlayResetKey}`;
  const routeSections = route ? splitRouteByTutorMatches(route.polyline, tutorMatches) : [];

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
      setLastRenderableHeading((previous) => smoothHeading(previous, heading, 0.32));
    }
  }, [heading]);

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
  }, [visibleUserLocation, safeHeading, isNavigating, followUserLocation]);

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
        showsUserLocation
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
              strokeColor="rgba(8,13,28,0.56)"
              strokeWidth={8}
              zIndex={1}
            />
            {routeSections.map((section) => {
              const isTutorSection = section.type === 'tutor';
              const isActiveTutorSection = activeTutorSegment?.id === section.tutorId;
              return (
                <Polyline
                  key={`route-section-${routeKey}-${section.id}`}
                  coordinates={section.coordinates}
                  strokeColor={isTutorSection ? (isActiveTutorSection ? '#22D3EE' : '#F97316') : '#7C3AED'}
                  strokeWidth={isTutorSection ? 5.5 : 5}
                  zIndex={isTutorSection ? 3 : 2}
                />
              );
            })}
            {maneuverCue?.section && maneuverCue.section.length > 1 ? (
              <Polyline
                key={`route-cue-${routeKey}-${maneuverCue.id}`}
                coordinates={maneuverCue.section}
                strokeColor="#FBBF24"
                strokeWidth={8}
                zIndex={5}
              />
            ) : null}
            {maneuverCue?.arrow ? (
              <Marker
                key={maneuverCue.arrow.id}
                coordinate={maneuverCue.arrow.coordinate}
                anchor={{ x: 0.5, y: 0.5 }}
                zIndex={8}
              >
                <View style={[styles.routeArrowShell, { transform: [{ rotate: `${maneuverCue.arrow.heading}deg` }] }]}>
                  <View style={styles.routeArrowOutline} />
                  <View style={styles.routeArrowHead} />
                  <View style={styles.routeArrowStem} />
                </View>
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
          <UserLocationLayer
            coordinate={visibleUserLocation}
            heading={safeHeading}
          />
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
  routeArrowShell: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.32,
    shadowRadius: 4,
    elevation: 8,
  },
  routeArrowHead: {
    position: 'absolute',
    top: 4,
    left: 6,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FBBF24',
  },
  routeArrowOutline: {
    position: 'absolute',
    top: 1,
    left: 3,
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderBottomWidth: 24,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(8,13,28,0.88)',
  },
  routeArrowStem: {
    position: 'absolute',
    top: 21,
    left: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B45309',
    borderWidth: 1,
    borderColor: 'rgba(254,243,199,0.9)',
  },
});
