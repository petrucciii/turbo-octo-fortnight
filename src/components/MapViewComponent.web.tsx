import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Coordinate, MapDisplayType, RouteInfo } from '../types/navigation';
import { TutorSegment } from '../types/tutor';
import { projectCoordinate } from '../utils/motion';
import { ManeuverRouteCue } from '../utils/routeArrows';

interface Props {
  userLocation: Coordinate | null;
  origin: Coordinate | null;
  route: RouteInfo | null;
  tutorSegments: TutorSegment[];
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
    width: 30px;
    height: 30px;
    position: relative;
    transform: rotate(${rotation}deg);
    transform-origin: 15px 15px;
    filter: drop-shadow(0 2px 5px rgba(0,0,0,.42));
  ">
    <div style="
      position: absolute;
      left: 7px;
      top: 2px;
      width: 16px;
      height: 24px;
      background: linear-gradient(180deg,#67E8F9 0%,#0284C7 100%);
      clip-path: polygon(50% 0%, 88% 82%, 50% 68%, 12% 82%);
      border-radius: 8px;
    "></div>
    <div style="
      position: absolute;
      left: 12px;
      top: 13px;
      width: 6px;
      height: 6px;
      border-radius: 3px;
      background: rgba(8,47,73,.9);
    "></div>
  </div>`;
};

const getRouteArrowHtml = (heading: number): string => {
  return `<div style="
    width: 0;
    height: 0;
    transform: rotate(${heading}deg);
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-bottom: 17px solid #22D3EE;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,.35));
  "></div>`;
};

export const MapViewComponent: React.FC<Props> = ({
  userLocation,
  origin,
  route,
  tutorSegments,
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
  const routeLayerRef = useRef<any>(null);
  const routeOutlineLayerRef = useRef<any>(null);
  const maneuverCueLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const baseLayerRef = useRef<any>(null);
  const labelLayerRef = useRef<any>(null);
  const isNavigatingRef = useRef(isNavigating);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [LLib, setLLib] = useState<any>(null);

  const centerOnUser = (animate = true) => {
    if (!mapInstanceRef.current || !userLocation) return;
    const map = mapInstanceRef.current;
    const safeHeading = typeof heading === 'number' && Number.isFinite(heading) ? heading : null;
    const center = safeHeading !== null ? projectCoordinate(userLocation, safeHeading, 62) : userLocation;
    map.setView([center.latitude, center.longitude], isNavigating ? 18 : Math.max(map.getZoom(), 15), {
      animate,
    });
  };

  const clearRouteLayers = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
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

    const defaultLat = userLocation?.latitude || origin?.latitude || 41.9028;
    const defaultLng = userLocation?.longitude || origin?.longitude || 12.4964;

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
    if (!mapInstanceRef.current || !LLib || !userLocation) return;

    const map = mapInstanceRef.current;
    const icon = LLib.divIcon({
      className: '',
      html: getUserArrowHtml(heading),
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.latitude, userLocation.longitude]);
      userMarkerRef.current.setIcon(icon);
    } else {
      userMarkerRef.current = LLib.marker([userLocation.latitude, userLocation.longitude], {
        icon,
        zIndexOffset: 1000,
      }).addTo(map);
    }

    if (isNavigating && followUserLocation) {
      centerOnUser(true);
    } else if (!route) {
      map.setView([userLocation.latitude, userLocation.longitude], map.getZoom(), { animate: true });
    }
  }, [userLocation, heading, isNavigating, followUserLocation, route, LLib]);

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
      routeLayerRef.current = LLib.polyline(latlngs, {
        color: '#7C3AED',
        weight: 5,
        opacity: 0.95,
      }).addTo(map);

      if (maneuverCue?.section && maneuverCue.section.length > 1) {
        maneuverCueLayerRef.current = LLib.polyline(
          maneuverCue.section.map((point) => [point.latitude, point.longitude]),
          {
            color: '#22D3EE',
            weight: 7,
            opacity: 0.92,
          }
        ).addTo(map);
      }

      if (maneuverCue?.arrow) {
        const icon = LLib.divIcon({
          className: '',
          html: getRouteArrowHtml(maneuverCue.arrow.heading),
          iconSize: [18, 20],
          iconAnchor: [9, 10],
        });
        routeArrowMarkersRef.current = [LLib.marker([maneuverCue.arrow.coordinate.latitude, maneuverCue.arrow.coordinate.longitude], {
          icon,
          interactive: false,
          zIndexOffset: 650,
        }).addTo(map)];
      }

      if (!isNavigating) {
        map.fitBounds(routeLayerRef.current.getBounds(), { padding: [70, 70] });
      }
    }
  }, [route, maneuverCue, isNavigating, overlayResetKey, LLib]);

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
      const color = isActive ? '#00c853' : '#ff8f00';
      const start = [segment.start_latitude, segment.start_longitude];
      const end = [segment.end_latitude, segment.end_longitude];

      markersRef.current.push(
        LLib.polyline([start, end], {
          color,
          weight: isActive ? 9 : 7,
          opacity: 0.95,
        }).addTo(map)
      );

      const labelIcon = LLib.divIcon({
        className: '',
        html: `<div style="background:${color};color:#fff;font-weight:900;border:2px solid #fff;border-radius:10px;padding:4px 8px;box-shadow:0 2px 4px rgba(0,0,0,.25);">Tutor</div>`,
        iconSize: [62, 28],
        iconAnchor: [31, 34],
      });
      const startIcon = LLib.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px rgba(0,0,0,.35);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      const endIcon = LLib.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;background:#e74c3c;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px rgba(0,0,0,.35);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      markersRef.current.push(
        LLib.marker(start, { icon: startIcon })
          .bindPopup(`Inizio Tutor: ${segment.name}`)
          .addTo(map),
        LLib.marker(end, { icon: endIcon })
          .bindPopup(`Fine Tutor: ${segment.name}`)
          .addTo(map),
        LLib.marker(start, { icon: labelIcon }).addTo(map)
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
