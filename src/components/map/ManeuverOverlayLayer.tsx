import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker, Polyline } from 'react-native-maps';
import { ManeuverRouteCue } from '../../utils/routeArrows';

interface Props {
  maneuverCue: ManeuverRouteCue | null;
}

export const ManeuverOverlayLayer: React.FC<Props> = ({ maneuverCue }) => {
  if (!maneuverCue) return null;

  return (
    <>
      {maneuverCue.section.length > 1 ? (
        <Polyline
          key={`route-cue-${maneuverCue.id}`}
          coordinates={maneuverCue.section}
          strokeColor="#FBBF24"
          strokeWidth={8}
          zIndex={5}
        />
      ) : null}
      {maneuverCue.arrow ? (
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
    </>
  );
};

const styles = StyleSheet.create({
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
