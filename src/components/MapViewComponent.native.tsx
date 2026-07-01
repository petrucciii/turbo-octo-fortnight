import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { RouteInfo, Coordinate, MapDisplayType } from '../types/navigation';
import { TutorSegment } from '../types/tutor';
import { smoothHeading } from '../utils/motion';
import { ManeuverRouteCue } from '../utils/routeArrows';
import type { RouteTutorMatch } from '../utils/routeProgress';
import { UserLocationLayer } from './map/UserLocationLayer';
import { RouteOverlayLayer } from './map/RouteOverlayLayer';
import { TutorOverlayLayer } from './map/TutorOverlayLayer';
import { ManeuverOverlayLayer } from './map/ManeuverOverlayLayer';
import { useMapCameraController } from './map/useMapCameraController';

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
  const [lastRenderableHeading, setLastRenderableHeading] = useState<number | null>(
    typeof heading === 'number' && Number.isFinite(heading) ? heading : null
  );
  const visibleUserLocation = isValidCoordinate(userLocation) ? userLocation : null;
  const safeHeading = getSafeHeading(lastRenderableHeading, 0);

  useEffect(() => {
    if (typeof heading === 'number' && Number.isFinite(heading)) {
      setLastRenderableHeading((previous) => smoothHeading(previous, heading, 0.32));
    }
  }, [heading]);

  useMapCameraController({
    mapRef,
    userLocation: visibleUserLocation,
    heading: lastRenderableHeading,
    route,
    origin,
    destination,
    isNavigating,
    followUserLocation,
    recenterRequestId,
  });

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
        // The app uses the custom UserLocationLayer as the only user-position marker.
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
