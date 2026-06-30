import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Coordinate, RouteInfo } from '../types/navigation';
import { TutorSegment } from '../types/tutor';

interface Props {
  userLocation: Coordinate | null;
  origin: Coordinate | null;
  route: RouteInfo | null;
  tutorSegments: TutorSegment[];
  activeTutorSegment: TutorSegment | null;
  destination: Coordinate | null;
  heading: number | null;
  isNavigating: boolean;
}

const getUserMarkerHtml = (heading: number | null): string => {
  const rotation = heading ?? 0;
  return `<div style="
    width: 28px;
    height: 28px;
    position: relative;
    transform: rotate(${rotation}deg);
  ">
    <div style="
      position: absolute;
      left: 8px;
      top: -2px;
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 13px solid #4285f4;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,.45));
    "></div>
    <div style="
      position: absolute;
      left: 5px;
      top: 5px;
      width: 18px;
      height: 18px;
      background: #4285f4;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 14px rgba(66,133,244,.65);
    "></div>
  </div>`;
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
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const routeLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [LLib, setLLib] = useState<any>(null);

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
    }).setView([defaultLat, defaultLng], 13);

    LLib.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    LLib.control.zoom({ position: 'bottomright' }).addTo(map);
    mapInstanceRef.current = map;

    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [leafletLoaded, LLib, origin, userLocation]);

  useEffect(() => {
    if (!mapInstanceRef.current || !LLib || !userLocation) return;

    const map = mapInstanceRef.current;
    const icon = LLib.divIcon({
      className: '',
      html: getUserMarkerHtml(heading),
      iconSize: [28, 28],
      iconAnchor: [14, 14],
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

    if (isNavigating) {
      map.setView([userLocation.latitude, userLocation.longitude], Math.max(map.getZoom(), 17), {
        animate: true,
      });
    } else if (!route) {
      map.setView([userLocation.latitude, userLocation.longitude], map.getZoom(), { animate: true });
    }
  }, [userLocation, heading, isNavigating, route, LLib]);

  useEffect(() => {
    if (!mapInstanceRef.current || !LLib) return;
    const map = mapInstanceRef.current;

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (route && route.polyline.length > 0) {
      const latlngs = route.polyline.map((point) => [point.latitude, point.longitude]);
      routeLayerRef.current = LLib.polyline(latlngs, {
        color: '#3498db',
        weight: 6,
        opacity: 0.88,
      }).addTo(map);

      if (!isNavigating) {
        map.fitBounds(routeLayerRef.current.getBounds(), { padding: [60, 60] });
      }
    }
  }, [route, isNavigating, LLib]);

  useEffect(() => {
    if (!mapInstanceRef.current || !LLib) return;
    const map = mapInstanceRef.current;

    markersRef.current.forEach((marker) => map.removeLayer(marker));
    markersRef.current = [];

    if (origin) {
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
      const color = isActive ? '#2ecc71' : '#f39c12';
      const start = [segment.start_latitude, segment.start_longitude];
      const end = [segment.end_latitude, segment.end_longitude];

      markersRef.current.push(
        LLib.polyline([start, end], {
          color,
          weight: isActive ? 6 : 4,
          opacity: 0.9,
          dashArray: isActive ? undefined : '10 8',
        }).addTo(map)
      );

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
          .addTo(map)
      );
    });
  }, [origin, tutorSegments, activeTutorSegment, destination, LLib]);

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
