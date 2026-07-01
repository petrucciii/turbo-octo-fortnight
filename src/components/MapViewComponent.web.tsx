import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Coordinate, MapDisplayType, RouteInfo } from '../types/navigation';
import { TutorSegment } from '../types/tutor';
import { projectCoordinate, smoothHeading } from '../utils/motion';
import { ManeuverRouteCue } from '../utils/routeArrows';
import type { RouteTutorMatch } from '../utils/routeProgress';
import { splitRouteByTutorMatches } from '../utils/routeGeometry';

// Leaflet is loaded from CDN at runtime for the Expo web build. These minimal
// structural types keep that dynamic boundary explicit without bundling Leaflet.
type LeafletLatLng = [number, number];
type LeafletBounds = unknown;

interface LeafletLayer {
  addTo(map: LeafletMapInstance): this;
}

interface LeafletIcon {}

interface LeafletMarker extends LeafletLayer {
  bindPopup(text: string): this;
  setIcon(icon: LeafletIcon): void;
  setLatLng(latLng: LeafletLatLng): void;
}

interface LeafletPolyline extends LeafletLayer {
  getBounds(): LeafletBounds;
}

interface LeafletMapInstance {
  fitBounds(bounds: LeafletBounds, options?: { padding?: [number, number] }): void;
  getZoom(): number;
  invalidateSize(): void;
  on(event: string, handler: () => void): void;
  remove(): void;
  removeLayer(layer: LeafletLayer): void;
  setView(latLng: LeafletLatLng, zoom: number, options?: { animate?: boolean; duration?: number }): this;
}

interface LeafletLibrary {
  control: {
    zoom(options: { position: string }): LeafletLayer;
  };
  divIcon(options: { className: string; html: string; iconSize: [number, number]; iconAnchor: [number, number] }): LeafletIcon;
  map(container: HTMLDivElement, options: { zoomControl: boolean }): LeafletMapInstance;
  marker(latLng: LeafletLatLng, options?: { icon?: LeafletIcon; interactive?: boolean; zIndexOffset?: number }): LeafletMarker;
  polyline(latLngs: LeafletLatLng[], options: { color: string; weight: number; opacity: number }): LeafletPolyline;
  tileLayer(url: string, options: Record<string, unknown>): LeafletLayer;
}

declare global {
  interface Window {
    L?: LeafletLibrary;
  }
}

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
  followAnimationDurationMs?: number;
  followThrottleMs?: number;
  onUserGesture: () => void;
}

const getUserArrowHtml = (heading: number | null): string => {
  const rotation = typeof heading === 'number' && Number.isFinite(heading) ? heading : 0;
  return `<div style="
    width: 36px;
    height: 36px;
    position: relative;
    transform: rotate(${rotation}deg);
    transform-origin: 18px 18px;
    filter: drop-shadow(0 2px 6px rgba(2,6,23,.48));
  ">
    <div style="
      position: absolute;
      left: 6px;
      top: 3px;
      width: 24px;
      height: 30px;
      background: rgba(124,58,237,.18);
      border-radius: 14px;
    "></div>
    <div style="
      position: absolute;
      left: 6px;
      top: 1px;
      width: 24px;
      height: 26px;
      background: rgba(6,8,24,.94);
      clip-path: polygon(50% 0%, 100% 100%, 64% 92%, 50% 70%, 36% 92%, 0% 100%);
      border-radius: 8px;
    "></div>
    <div style="
      position: absolute;
      left: 9px;
      top: 5px;
      width: 18px;
      height: 20px;
      background: linear-gradient(180deg,#A78BFA 0%,#6D28D9 100%);
      clip-path: polygon(50% 0%, 90% 100%, 58% 86%, 50% 66%, 42% 86%, 10% 100%);
      border-radius: 8px;
    "></div>
    <div style="
      position:absolute;
      left:15px;
      top:16px;
      width:5px;
      height:5px;
      border-radius:3px;
      background:#DDD6FE;
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
    height:26px;
    min-width:94px;
    padding:0 9px 0 5px;
    border-radius:13px;
    background:${active ? 'rgba(30,27,75,.92)' : 'rgba(15,23,42,.9)'};
    border:1px solid ${active ? 'rgba(168,85,247,.9)' : 'rgba(251,146,60,.72)'};
    box-shadow:0 2px 7px rgba(2,6,23,.34);
    color:#F8FAFC;
    font-size:10px;
    font-weight:900;
    white-space:nowrap;
  ">
    <div style="
      width:15px;
      height:15px;
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
    width:30px;
    height:30px;
    position:relative;
    transform: rotate(${heading}deg);
    filter: drop-shadow(0 2px 4px rgba(2,6,23,.38));
  ">
    <div style="
      position:absolute;
      left:4px;
      top:1px;
      width:0;
      height:0;
      border-left:11px solid transparent;
      border-right:11px solid transparent;
      border-bottom:24px solid rgba(8,13,28,.88);
    "></div>
    <div style="
      position:absolute;
      left:7px;
      top:4px;
      width:0;
      height:0;
      border-left:8px solid transparent;
      border-right:8px solid transparent;
      border-bottom:18px solid #FBBF24;
    "></div>
    <div style="
      position:absolute;
      left:11px;
      top:21px;
      width:8px;
      height:8px;
      border-radius:4px;
      background:#B45309;
      border:1px solid rgba(254,243,199,.9);
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
  followAnimationDurationMs,
  followThrottleMs = 0,
  onUserGesture,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletMapInstance | null>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const routeArrowMarkersRef = useRef<LeafletMarker[]>([]);
  const routeLayerRefs = useRef<LeafletPolyline[]>([]);
  const routeOutlineLayerRef = useRef<LeafletPolyline | null>(null);
  const maneuverCueLayerRef = useRef<LeafletPolyline | null>(null);
  const userMarkerRef = useRef<LeafletMarker | null>(null);
  const baseLayerRef = useRef<LeafletLayer | null>(null);
  const labelLayerRef = useRef<LeafletLayer | null>(null);
  const isNavigatingRef = useRef(isNavigating);
  const onUserGestureRef = useRef(onUserGesture);
  const lastFollowCenterAtRef = useRef(0);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [LLib, setLLib] = useState<LeafletLibrary | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [lastRenderableUserLocation, setLastRenderableUserLocation] = useState<Coordinate | null>(
    isValidCoordinate(userLocation) ? userLocation : null
  );
  const [lastRenderableHeading, setLastRenderableHeading] = useState<number | null>(
    typeof heading === 'number' && Number.isFinite(heading) ? heading : null
  );
  const visibleUserLocation = isValidCoordinate(userLocation) ? userLocation : lastRenderableUserLocation;
  const visibleHeading = lastRenderableHeading;

  const centerOnUser = (animate = true, durationMs?: number) => {
    if (!mapInstanceRef.current || !visibleUserLocation) return;
    const map = mapInstanceRef.current;
    const center = visibleHeading !== null ? projectCoordinate(visibleUserLocation, visibleHeading, 62) : visibleUserLocation;
    map.setView([center.latitude, center.longitude], isNavigating ? 18 : Math.max(map.getZoom(), 15), {
      animate: animate && durationMs !== 0,
      ...(typeof durationMs === 'number' && durationMs > 0 ? { duration: durationMs / 1000 } : {}),
    });
  };

  const clearRouteShapeLayers = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    routeLayerRefs.current.forEach((layer) => map.removeLayer(layer));
    routeLayerRefs.current = [];
    if (routeOutlineLayerRef.current) {
      map.removeLayer(routeOutlineLayerRef.current);
      routeOutlineLayerRef.current = null;
    }
  };

  const clearManeuverLayers = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (maneuverCueLayerRef.current) {
      map.removeLayer(maneuverCueLayerRef.current);
      maneuverCueLayerRef.current = null;
    }
    routeArrowMarkersRef.current.forEach((marker) => map.removeLayer(marker));
    routeArrowMarkersRef.current = [];
  };

  const clearRouteLayers = () => {
    clearRouteShapeLayers();
    clearManeuverLayers();
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
    onUserGestureRef.current = onUserGesture;
  }, [onUserGesture]);

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

      if (!window.L) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.crossOrigin = '';
          script.onload = () => resolve();
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      setLLib(window.L ?? null);
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
      if (isNavigatingRef.current) onUserGestureRef.current();
    });

    LLib.control.zoom({ position: 'bottomright' }).addTo(map);
    mapInstanceRef.current = map;
    setMapReady(true);

    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      setMapReady(false);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [leafletLoaded, LLib]);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !LLib) return;
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
  }, [mapReady, mapType, LLib]);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !LLib || !visibleUserLocation) return;

    const map = mapInstanceRef.current;
    const icon = LLib.divIcon({
      className: '',
      html: getUserArrowHtml(visibleHeading),
      iconSize: [36, 36],
      iconAnchor: [18, 18],
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
      const now = Date.now();
      if (!followThrottleMs || now - lastFollowCenterAtRef.current >= followThrottleMs) {
        lastFollowCenterAtRef.current = now;
        centerOnUser(followAnimationDurationMs !== 0, followAnimationDurationMs);
      }
    } else if (!route) {
      map.setView([visibleUserLocation.latitude, visibleUserLocation.longitude], map.getZoom(), { animate: true });
    }
  }, [
    visibleUserLocation,
    visibleHeading,
    isNavigating,
    followUserLocation,
    followAnimationDurationMs,
    followThrottleMs,
    route,
    LLib,
    mapReady,
  ]);

  useEffect(() => {
    if (!mapReady) return;
    centerOnUser(true);
  }, [mapReady, recenterRequestId]);

  useEffect(() => {
    if (!mapReady) return;
    clearNavigationLayers();
    centerOnUser(true);
  }, [mapReady, overlayResetKey]);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !LLib) return;
    const map = mapInstanceRef.current;

    // Route geometry changes rarely. Keep it separate from maneuver cues so
    // demo movement does not recreate the whole blue/purple path every frame.
    clearRouteShapeLayers();

    if (route && route.polyline.length > 0) {
      const latlngs: LeafletLatLng[] = route.polyline.map((point) => [point.latitude, point.longitude]);
      routeOutlineLayerRef.current = LLib.polyline(latlngs, {
        color: 'rgba(8,13,28,.58)',
        weight: 7,
        opacity: 0.94,
      }).addTo(map);
      const routeSections = splitRouteByTutorMatches(route.polyline, tutorMatches);
      routeLayerRefs.current = routeSections.map((section) => {
        const isTutorSection = section.type === 'tutor';
        const isActiveTutorSection = activeTutorSegment?.id === section.tutorId;
        return LLib.polyline(
          section.coordinates.map((point) => [point.latitude, point.longitude]),
          {
            color: isTutorSection ? (isActiveTutorSection ? '#22D3EE' : '#F97316') : '#7C3AED',
            weight: isTutorSection ? 5.5 : 5,
          opacity: 0.96,
        }
      ).addTo(map);
      });

      if (!isNavigating && routeOutlineLayerRef.current) {
        map.fitBounds(routeOutlineLayerRef.current.getBounds(), { padding: [70, 70] });
      }
    } else {
      clearManeuverLayers();
    }
  }, [mapReady, route, tutorMatches, activeTutorSegment, isNavigating, overlayResetKey, LLib]);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !LLib) return;
    const map = mapInstanceRef.current;

    // The yellow maneuver cue follows current progress and can update often.
    clearManeuverLayers();

    if (!route) return;

    if (maneuverCue?.section && maneuverCue.section.length > 1) {
      maneuverCueLayerRef.current = LLib.polyline(
        maneuverCue.section.map((point) => [point.latitude, point.longitude]),
        {
          color: '#FBBF24',
          weight: 8,
          opacity: 0.92,
        }
      ).addTo(map);
    }

    if (maneuverCue?.arrow) {
      const icon = LLib.divIcon({
        className: '',
        html: getRouteArrowHtml(maneuverCue.arrow.heading),
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      routeArrowMarkersRef.current = [LLib.marker([maneuverCue.arrow.coordinate.latitude, maneuverCue.arrow.coordinate.longitude], {
        icon,
        interactive: false,
        zIndexOffset: 650,
      }).addTo(map)];
    }
  }, [mapReady, route, maneuverCue, overlayResetKey, LLib]);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !LLib) return;
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
      const start: LeafletLatLng = [segment.start_latitude, segment.start_longitude];
      const end: LeafletLatLng = [segment.end_latitude, segment.end_longitude];

      const startIcon = LLib.divIcon({
        className: '',
        html: getTutorMarkerHtml('start', isActive),
        iconSize: [98, 26],
        iconAnchor: [49, 24],
      });
      const endIcon = LLib.divIcon({
        className: '',
        html: getTutorMarkerHtml('end', isActive),
        iconSize: [98, 26],
        iconAnchor: [49, 24],
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
  }, [mapReady, origin, tutorSegments, activeTutorSegment, destination, isNavigating, overlayResetKey, LLib]);

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
        ref={mapContainerRef}
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
