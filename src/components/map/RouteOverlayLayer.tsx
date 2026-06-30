import React from 'react';
import { Marker, Polyline } from 'react-native-maps';
import { Coordinate, RouteInfo } from '../../types/navigation';
import type { RouteTutorMatch } from '../../utils/routeProgress';
import { splitRouteByTutorMatches } from '../../utils/routeGeometry';
import { TutorSegment } from '../../types/tutor';

interface Props {
  route: RouteInfo | null;
  origin: Coordinate | null;
  destination: Coordinate | null;
  tutorMatches: RouteTutorMatch[];
  activeTutorSegment: TutorSegment | null;
  isNavigating: boolean;
}

export const RouteOverlayLayer: React.FC<Props> = ({
  route,
  origin,
  destination,
  tutorMatches,
  activeTutorSegment,
  isNavigating,
}) => {
  const routeKey = route
    ? `${route.polyline.length}-${route.distanceKm.toFixed(3)}-${route.durationMinutes.toFixed(1)}-${destination?.latitude ?? 'no-dest'}-${destination?.longitude ?? 'no-dest'}`
    : 'no-route';
  const routeSections = route ? splitRouteByTutorMatches(route.polyline, tutorMatches) : [];

  return (
    <>
      {route ? (
        <>
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
        </>
      ) : null}

      {origin && !isNavigating ? (
        <Marker coordinate={origin} title="Partenza" pinColor="#2ecc71" />
      ) : null}

      {destination ? (
        <Marker coordinate={destination} title="Destinazione" pinColor="#e74c3c" />
      ) : null}
    </>
  );
};
