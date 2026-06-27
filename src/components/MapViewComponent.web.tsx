import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { Coordinate, RouteInfo } from '../types/navigation';
import { TutorSegment } from '../types/tutor';

interface Props {
  userLocation: Coordinate | null;
  route: RouteInfo | null;
  tutorSegments: TutorSegment[];
  activeTutorSegment: TutorSegment | null;
  destination: Coordinate | null;
}

// Leaflet-based web map implementation
export const MapViewComponent: React.FC<Props> = ({
  userLocation,
  route,
  tutorSegments,
  activeTutorSegment,
  destination,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const routeLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [LLib, setLLib] = useState<any>(null);

  // Load Leaflet dynamically
  useEffect(() => {
    const loadLeaflet = async () => {
      // Inject Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.crossOrigin = '';
        document.head.appendChild(link);
      }

      // Inject Leaflet JS
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

  // Initialize map
  useEffect(() => {
    if (!leafletLoaded || !LLib || !mapContainerRef.current || mapInstanceRef.current) return;

    const defaultLat = userLocation?.latitude || 41.9028;
    const defaultLng = userLocation?.longitude || 12.4964;

    const map = LLib.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([defaultLat, defaultLng], 13);

    // Dark themed tile layer (CartoDB Dark Matter)
    LLib.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    // Zoom control in basso a destra
    LLib.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;

    // Force resize after mount
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [leafletLoaded, LLib]);

  // Update user location marker
  useEffect(() => {
    if (!mapInstanceRef.current || !LLib || !userLocation) return;

    const map = mapInstanceRef.current;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.latitude, userLocation.longitude]);
    } else {
      const pulsingIcon = LLib.divIcon({
        className: '',
        html: `<div style="
          width: 18px; height: 18px;
          background: #4285F4;
          border: 3px solid #fff;
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(66, 133, 244, 0.6);
        "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      userMarkerRef.current = LLib.marker([userLocation.latitude, userLocation.longitude], {
        icon: pulsingIcon,
        zIndexOffset: 1000,
      }).addTo(map);
    }

    map.setView([userLocation.latitude, userLocation.longitude], map.getZoom(), { animate: true });
  }, [userLocation, LLib]);

  // Draw route polyline
  useEffect(() => {
    if (!mapInstanceRef.current || !LLib) return;
    const map = mapInstanceRef.current;

    // Remove old route
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (route && route.polyline.length > 0) {
      const latlngs = route.polyline.map((p) => [p.latitude, p.longitude]);
      routeLayerRef.current = LLib.polyline(latlngs, {
        color: '#3498db',
        weight: 5,
        opacity: 0.8,
      }).addTo(map);

      // Fit bounds to route
      map.fitBounds(routeLayerRef.current.getBounds(), { padding: [50, 50] });
    }
  }, [route, LLib]);

  // Draw tutor segments and destination markers
  useEffect(() => {
    if (!mapInstanceRef.current || !LLib) return;
    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    // Destination marker
    if (destination) {
      const destIcon = LLib.divIcon({
        className: '',
        html: `<div style="
          width: 24px; height: 24px;
          background: #e74c3c;
          border: 3px solid #fff;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(231, 76, 60, 0.6);
          display: flex; align-items: center; justify-content: center;
        "><div style="width:6px;height:6px;background:#fff;border-radius:50%"></div></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const m = LLib.marker([destination.latitude, destination.longitude], { icon: destIcon })
        .bindPopup('Destinazione')
        .addTo(map);
      markersRef.current.push(m);
    }

    // Tutor segment markers
    tutorSegments.forEach((seg) => {
      const isActive = activeTutorSegment?.id === seg.id;

      const startIcon = LLib.divIcon({
        className: '',
        html: `<div style="
          width: 14px; height: 14px;
          background: ${isActive ? '#2ecc71' : '#3498db'};
          border: 2px solid #fff;
          border-radius: 50%;
          box-shadow: 0 0 6px ${isActive ? 'rgba(46, 204, 113, 0.5)' : 'rgba(52, 152, 219, 0.5)'};
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const endIcon = LLib.divIcon({
        className: '',
        html: `<div style="
          width: 14px; height: 14px;
          background: ${isActive ? '#e74c3c' : '#3498db'};
          border: 2px solid #fff;
          border-radius: 50%;
          box-shadow: 0 0 6px ${isActive ? 'rgba(231, 76, 60, 0.5)' : 'rgba(52, 152, 219, 0.5)'};
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const sm = LLib.marker([seg.start_latitude, seg.start_longitude], { icon: startIcon })
        .bindPopup(`Inizio Tutor: ${seg.name}`)
        .addTo(map);

      const em = LLib.marker([seg.end_latitude, seg.end_longitude], { icon: endIcon })
        .bindPopup(`Fine Tutor: ${seg.name}`)
        .addTo(map);

      markersRef.current.push(sm, em);
    });
  }, [tutorSegments, activeTutorSegment, destination, LLib]);

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
    ...StyleSheet.absoluteFillObject,
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
