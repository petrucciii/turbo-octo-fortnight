import React from 'react';
import { Marker } from 'react-native-maps';
import { Coordinate } from '../../types/navigation';
import { UserPositionArrow } from '../UserPositionArrow';

interface Props {
  coordinate: Coordinate;
  heading: number;
}

const getSafeHeading = (heading: number): number => {
  return Number.isFinite(heading) ? heading : 0;
};

export const UserLocationLayer = React.memo(function UserLocationLayer({
  coordinate,
  heading,
}: Props) {
  const safeHeading = getSafeHeading(heading);

  return (
    <Marker
      identifier="user-location-marker"
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={99999}
      flat
      rotation={safeHeading}
      tracksViewChanges={false}
    >
      <UserPositionArrow heading={0} />
    </Marker>
  );
});
