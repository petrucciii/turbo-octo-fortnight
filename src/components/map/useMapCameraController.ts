import { RefObject, useEffect, useRef } from 'react';
import MapView from 'react-native-maps';
import { Coordinate, RouteInfo } from '../../types/navigation';
import { projectCoordinate } from '../../utils/motion';

interface UseMapCameraControllerParams {
  mapRef: RefObject<MapView | null>;
  userLocation: Coordinate | null;
  heading: number | null;
  route: RouteInfo | null;
  origin: Coordinate | null;
  destination: Coordinate | null;
  isNavigating: boolean;
  followUserLocation: boolean;
  recenterRequestId: number;
}

const getSafeHeading = (heading: number | null, fallback = 0): number => {
  return typeof heading === 'number' && Number.isFinite(heading) ? heading : fallback;
};

const getCameraCenter = (coordinate: Coordinate, heading: number | null): Coordinate => {
  if (heading === null) return coordinate;
  return projectCoordinate(coordinate, heading, 72);
};

export const useMapCameraController = ({
  mapRef,
  userLocation,
  heading,
  route,
  origin,
  destination,
  isNavigating,
  followUserLocation,
  recenterRequestId,
}: UseMapCameraControllerParams) => {
  const hasCenteredInitialLocationRef = useRef(false);
  const safeHeading = getSafeHeading(heading, 0);

  const animateToUser = (duration = 700) => {
    if (!mapRef.current || !userLocation) return;

    mapRef.current.animateCamera(
      {
        center: getCameraCenter(userLocation, heading),
        pitch: isNavigating ? 58 : 0,
        heading: isNavigating ? safeHeading : 0,
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

    const timeout = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 130, right: 52, bottom: 300, left: 52 },
        animated: true,
      });
    }, 250);

    return () => clearTimeout(timeout);
  }, [mapRef, route, origin, destination, isNavigating]);

  useEffect(() => {
    if (!isNavigating || !followUserLocation) return;
    animateToUser();
  }, [userLocation, safeHeading, isNavigating, followUserLocation]);

  useEffect(() => {
    if (hasCenteredInitialLocationRef.current || !userLocation || route) return;
    hasCenteredInitialLocationRef.current = true;
    animateToUser(650);
  }, [userLocation, route]);

  useEffect(() => {
    animateToUser(500);
  }, [recenterRequestId]);
};
