import React from 'react';
import { Marker } from 'react-native-maps';
import { TutorSegment } from '../../types/tutor';
import { TutorMapMarker } from '../TutorMapMarker';

interface Props {
  tutorSegments: TutorSegment[];
  activeTutorSegment: TutorSegment | null;
}

export const TutorOverlayLayer: React.FC<Props> = ({
  tutorSegments,
  activeTutorSegment,
}) => {
  return (
    <>
      {tutorSegments.map((segment) => {
        const isActive = activeTutorSegment?.id === segment.id;
        const start = { latitude: segment.start_latitude, longitude: segment.start_longitude };
        const end = { latitude: segment.end_latitude, longitude: segment.end_longitude };

        return (
          <React.Fragment key={segment.id}>
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
    </>
  );
};
