import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { RouteInfo, Coordinate, MapDisplayType } from '../types/navigation';
import { TutorSegment } from '../types/tutor';
import { projectCoordinate, smoothHeading } from '../utils/motion';
import { ManeuverRouteCue } from '../utils/routeArrows';
import type { RouteTutorMatch } from '../utils/routeProgress';
import { UserLocationLayer } from './map/UserLocationLayer';
import { RouteOverlayLayer } from './map/RouteOverlayLayer';
import { TutorOverlayLayer } from './map/TutorOverlayLayer';
import { ManeuverOverlayLayer } from './map/ManeuverOverlayLayer';

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
  followUserLocation,
  recenterRequestId,
  onUserGesture,
}) => {
  const mapRef = useRef<MapView | null>(null);
  const hasCenteredInitialLocationRef = useRef(false);
  const [lastRenderableHeading, setLastRenderableHeading] = useState<number | null>(
    typeof heading === 'number' && Number.isFinite(heading) ? heading : null
  );
  const visibleUserLocation = isValidCoordinate(userLocation) ? userLocation : null;
  const safeHeading = getSafeHeading(lastRenderableHeading, 0);
  const cameraHeading = lastRenderableHeading;

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
        showsUserLocation={false}
        showsCompass={false}
        showsMyLocationButton={false}
        rotateEnabled
        pitchEnabled
        onPanDrag={() => {
          if (isNavigating) onUserGesture();
        }}
      >
        <RouteOverlayLayer
          route={route}
          origin={origin}
          destination={destination}
          tutorMatches={tutorMatches}
          activeTutorSegment={activeTutorSegment}
          isNavigating={isNavigating}
        />

        <TutorOverlayLayer
          tutorSegments={tutorSegments}
          activeTutorSegment={activeTutorSegment}
        />

        <ManeuverOverlayLayer maneuverCue={maneuverCue} />

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
});
