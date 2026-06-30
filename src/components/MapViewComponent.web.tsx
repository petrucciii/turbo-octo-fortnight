import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Coordinate, MapDisplayType, RouteInfo } from '../types/navigation';
import { TutorSegment } from '../types/tutor';
import { projectCoordinate, smoothHeading } from '../utils/motion';
import { ManeuverRouteCue } from '../utils/routeArrows';
import type { RouteTutorMatch } from '../utils/routeProgress';
import { splitRouteByTutorMatches } from '../utils/routeGeometry';

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

const getUserArrowHtml = (heading: number | null): string => {
  const rotation = typeof heading === 'number' && Number.isFinite(heading) ? heading : 0;
  return `<div style="
    width: 32px;
    height: 32px;
    position: relative;
    transform: rotate(${rotation}deg);
    transform-origin: 16px 16px;
    filter: drop-shadow(0 2px 5px rgba(2,6,23,.42));
  ">
    <div style="
      position: absolute;
      left: 7px;
      top: 2px;
      width: 18px;
      height: 24px;
      background: rgba(34,211,238,.18);
      border-radius: 10px;
    "></div>
    <div style="
      position: absolute;
      left: 7px;
      top: 2px;
      width: 18px;
      height: 26px;
      background: rgba(15,23,42,.9);
      clip-path: polygon(50% 0%, 92% 78%, 64% 70%, 64% 100%, 36% 100%, 36% 70%, 8% 78%);
      border-radius: 8px;
    "></div>
    <div style="
      position: absolute;
      left: 9px;
      top: 4px;
      width: 14px;
      height: 22px;
      background: linear-gradient(180deg,#67E8F9 0%,#0EA5E9 100%);
      clip-path: polygon(50% 0%, 88% 82%, 50% 68%, 12% 82%);
      border-radius: 8px;
    "></div>
    <div style="
      position:absolute;
      left:14px;
      top:15px;
      width:4px;
      height:4px;
      border-radius:2px;
      background:#E0F2FE;
    "></div>
  </div>`;
};

const getTutorMarkerHtml = (type: 'start' | 'end', active: boolean): string => {
  const isStart = type === 'start';
  const label = isStart ? 'Inizio Tutor' : 'Fine Tutor';
  const accent = active ? '#22D3EE' : isStart ? '#F97316' : '#A855F7';
  const glyph = isStart
    ? '<div style="width:2px;height:9px;border-radius:1px;background:#FFF7ED;"></div>'
    : '<div style="width:6px;height:6px;border-radius:3px;background:#F5F3FF;"></div>';

  return `<div style="
    display:flex;
    align-items:center;
    gap:6px;
    height:28px;
    min-width:100px;
    padding:0 10px 0 6px;
    border-radius:14px;
    background:${active ? 'rgba(30,27,75,.92)' : 'rgba(15,23,42,.9)'};
    border:1px solid ${active ? 'rgba(168,85,247,.9)' : 'rgba(251,146,60,.72)'};
    box-shadow:0 2px 7px rgba(2,6,23,.34);
    color:#F8FAFC;
    font-size:11px;
    font-weight:900;
    white-space:nowrap;
  ">
    <div style="
      width:16px;
      height:16px;
      border-radius:8px;
      display:flex;
      align-items:center;
      justify-content:center;
      background:${accent};
      border:1px solid rgba(255,255,255,.78);
    ">${glyph}</div>
    <span>${label}</span>
  </div>`;
};

const getRouteArrowHtml = (heading: number): string => {
  return `<div style="
    width:28px;
    height:28px;
    position:relative;
    transform: rotate(${heading}deg);
    filter: drop-shadow(0 2px 4px rgba(2,6,23,.38));
  ">
    <div style="
      position:absolute;
      left:5px;
      top:2px;
      width:0;
      height:0;
      border-left:9px solid transparent;
      border-right:9px solid transparent;
      border-bottom:20px solid #22D3EE;
    "></div>
    <div style="
      position:absolute;
      left:10px;
      top:17px;
      width:8px;
      height:8px;
      border-radius:4px;
      background:#0891B2;
      border:1px solid rgba(240,249,255,.85);
    "></div>
  </div>`;
};

const isValidCoordinate = (coordinate: Coordinate | null): coordinate is Coordinate => {
  return Boolean(
    coordinate &&
      Number.isFinite(coordinate.latitude) &&
      Number.isFinite(coordinate.longitude)
  );
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
  overlayResetKey,
  followUserLocation,
  recenterRequestId,
  onUserGesture,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const routeArrowMarkersRef = useRef<any[]>([]);
  const routeLayerRefs = useRef<any[]>([]);
  const routeOutlineLayerRef = useRef<any>(null);
  const maneuverCueLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const baseLayerRef = useRef<any>(null);
  const labelLayerRef = useRef<any>(null);
  const isNavigatingRef = useRef(isNavigating);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [LLib, setLLib] = useState<any>(null);
  const [lastRenderableUserLocation, setLastRenderableUserLocation] = useState<Coordinate | null>(
    isValidCoordinate(userLocation) ? userLocation : null
  );
  const [lastRenderableHeading, setLastRenderableHeading] = useState<number | null>(
    typeof heading === 'number' && Number.isFinite(heading) ? heading : null
  );
  const visibleUserLocation = isValidCoordinate(userLocation) ? userLocation : lastRenderableUserLocation;
  const visibleHeading = lastRenderableHeading;

  const centerOnUser = (animate = true) => {
    if (!mapInstanceRef.current || !visibleUserLocation) return;
    const map = mapInstanceRef.current;
    const center = visibleHeading !== null ? projectCoordinate(visibleUserLocation, visibleHeading, 62) : visibleUserLocation;
    map.setView([center.latitude, center.longitude], isNavigating ? 18 : Math.max(map.getZoom(), 15), {
      animate,
    });
  };

  const clearRouteLayers = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    routeLayerRefs.current.forEach((layer) => map.removeLayer(layer));
    routeLayerRefs.current = [];
    if (routeOutlineLayerRef.current) {
      map.removeLayer(routeOutlineLayerRef.current);
      routeOutlineLayerRef.current = null;
    }
    if (maneuverCueLayerRef.current) {
      map.removeLayer(maneuverCueLayerRef.current);
      maneuverCueLayerRef.current = null;
    }
    routeArrowMarkersRef.current.forEach((marker) => map.removeLayer(marker));
    routeArrowMarkersRef.current = [];
  };

  const clearNavigationLayers = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    clearRouteLayers();
    markersRef.current.forEach((marker) => map.removeLayer(marker));
    markersRef.current = [];
  };

  useEffect(() => {
    isNavigatingRef.current = isNavigating;
  }, [isNavigating]);

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
    const loadLeaflet = async () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.crossOrigin = '';
        document.head.appendChild(link);
      }

      if (!(window as any).L) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.crossOrigin = '';
          script.onload = () => resolve();
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      setLLib((window as any).L);
      setLeafletLoaded(true);
    };

    loadLeaflet().catch((err) => console.error('Failed to load Leaflet:', err));
  }, []);

  useEffect(() => {
    if (!leafletLoaded || !LLib || !mapContainerRef.current || mapInstanceRef.current) return;

    const defaultLat = visibleUserLocation?.latitude || origin?.latitude || 41.9028;
    const defaultLng = visibleUserLocation?.longitude || origin?.longitude || 12.4964;

    const map = LLib.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([defaultLat, defaultLng], 15);

    map.on('dragstart zoomstart', () => {
      if (isNavigatingRef.current) onUserGesture();
    });

    LLib.control.zoom({ position: 'bottomright' }).addTo(map);
    mapInstanceRef.current = map;

    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [leafletLoaded, LLib, onUserGesture]);

  useEffect(() => {
    if (!mapInstanceRef.current || !LLib) return;
    const map = mapInstanceRef.current;

    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current);
      baseLayerRef.current = null;
    }
    if (labelLayerRef.current) {
      map.removeLayer(labelLayerRef.current);
      labelLayerRef.current = null;
    }

    if (mapType === 'hybrid') {
      baseLayerRef.current = LLib.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri',
          maxZoom: 20,
        }
      ).addTo(map);
      labelLayerRef.current = LLib.tileLayer(
        'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '',
          maxZoom: 20,
          opacity: 0.72,
        }
      ).addTo(map);
    } else {
      baseLayerRef.current = LLib.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; OpenStreetMap &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 20,
        }
      ).addTo(map);
    }
  }, [mapType, LLib]);

  useEffect(() => {
    if (!mapInstanceRef.current || !LLib || !visibleUserLocation) return;

    const map = mapInstanceRef.current;
    const icon = LLib.divIcon({
      className: '',
      html: getUserArrowHtml(visibleHeading),
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([visibleUserLocation.latitude, visibleUserLocation.longitude]);
      userMarkerRef.current.setIcon(icon);
    } else {
      userMarkerRef.current = LLib.marker([visibleUserLocation.latitude, visibleUserLocation.longitude], {
        icon,
        zIndexOffset: 1000,
      }).addTo(map);
    }

    if (isNavigating && followUserLocation) {
      centerOnUser(true);
    } else if (!route) {
      map.setView([visibleUserLocation.latitude, visibleUserLocation.longitude], map.getZoom(), { animate: true });
    }
  }, [visibleUserLocation, visibleHeading, isNavigating, followUserLocation, route, LLib]);

  useEffect(() => {
    centerOnUser(true);
  }, [recenterRequestId]);

  useEffect(() => {
    clearNavigationLayers();
    centerOnUser(true);
  }, [overlayResetKey]);

  useEffect(() => {
    if (!mapInstanceRef.current || !LLib) return;
    const map = mapInstanceRef.current;

    clearRouteLayers();

    if (route && route.polyline.length > 0) {
      const latlngs = route.polyline.map((point) => [point.latitude, point.longitude]);
      routeOutlineLayerRef.current = LLib.polyline(latlngs, {
        color: '#fff',
        weight: 9,
        opacity: 0.92,
      }).addTo(map);
      const routeSections = splitRouteByTutorMatches(route.polyline, tutorMatches);
      routeLayerRefs.current = routeSections.map((section) => {
        const isTutorSection = section.type === 'tutor';
        const isActiveTutorSection = activeTutorSegment?.id === section.tutorId;
        return LLib.polyline(
          section.coordinates.map((point) => [point.latitude, point.longitude]),
          {
            color: isTutorSection ? (isActiveTutorSection ? '#22D3EE' : '#F97316') : '#7C3AED',
            weight: isTutorSection ? 6 : 5,
            opacity: 0.96,
          }
        ).addTo(map);
      });

      if (maneuverCue?.section && maneuverCue.section.length > 1) {
        maneuverCueLayerRef.current = LLib.polyline(
          maneuverCue.section.map((point) => [point.latitude, point.longitude]),
          {
            color: '#22D3EE',
            weight: 8,
            opacity: 0.92,
          }
        ).addTo(map);
      }

      if (maneuverCue?.arrow) {
        const icon = LLib.divIcon({
          className: '',
          html: getRouteArrowHtml(maneuverCue.arrow.heading),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        routeArrowMarkersRef.current = [LLib.marker([maneuverCue.arrow.coordinate.latitude, maneuverCue.arrow.coordinate.longitude], {
          icon,
          interactive: false,
          zIndexOffset: 650,
        }).addTo(map)];
      }

      if (!isNavigating && routeOutlineLayerRef.current) {
        map.fitBounds(routeOutlineLayerRef.current.getBounds(), { padding: [70, 70] });
      }
    }
  }, [route, tutorMatches, activeTutorSegment, maneuverCue, isNavigating, overlayResetKey, LLib]);

  useEffect(() => {
    if (!mapInstanceRef.current || !LLib) return;
    const map = mapInstanceRef.current;

    markersRef.current.forEach((marker) => map.removeLayer(marker));
    markersRef.current = [];

    if (origin && !isNavigating) {
      const originIcon = LLib.divIcon({
        className: '',
        html: `<div style="width:22px;height:22px;background:#2ecc71;border:3px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(46,204,113,.6);"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      markersRef.current.push(
        LLib.marker([origin.latitude, origin.longitude], { icon: originIcon })
          .bindPopup('Partenza')
          .addTo(map)
      );
    }

    if (destination) {
      const destIcon = LLib.divIcon({
        className: '',
        html: `<div style="width:24px;height:24px;background:#e74c3c;border:3px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(231,76,60,.6);display:flex;align-items:center;justify-content:center;"><div style="width:6px;height:6px;background:#fff;border-radius:50%"></div></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      markersRef.current.push(
        LLib.marker([destination.latitude, destination.longitude], { icon: destIcon })
          .bindPopup('Destinazione')
          .addTo(map)
      );
    }

    tutorSegments.forEach((segment) => {
      const isActive = activeTutorSegment?.id === segment.id;
      const color = isActive ? '#22D3EE' : '#F97316';
      const start = [segment.start_latitude, segment.start_longitude];
      const end = [segment.end_latitude, segment.end_longitude];

      const startIcon = LLib.divIcon({
        className: '',
        html: getTutorMarkerHtml('start', isActive),
        iconSize: [104, 28],
        iconAnchor: [52, 26],
      });
      const endIcon = LLib.divIcon({
        className: '',
        html: getTutorMarkerHtml('end', isActive),
        iconSize: [104, 28],
        iconAnchor: [52, 26],
      });

      markersRef.current.push(
        LLib.marker(start, { icon: startIcon })
          .bindPopup(`Inizio Tutor: ${segment.name}`)
          .addTo(map),
        LLib.marker(end, { icon: endIcon })
          .bindPopup(`Fine Tutor: ${segment.name}`)
          .addTo(map)
      );
    });
  }, [origin, tutorSegments, activeTutorSegment, destination, isNavigating, overlayResetKey, LLib]);

  if (!leafletLoaded) {
    return (
      <View style={[styles.container, styles.loading]}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Caricamento mappa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <div
        ref={mapContainerRef as any}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
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
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#242f3e',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
});
