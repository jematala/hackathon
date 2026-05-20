import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { Asset } from "expo-asset";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { UNSW_CENTER, DEMO_POIS } from "@/constants/coordinates";
import { createPOIMarker, createUserAvatarMarker, toLeafletIcon } from "./markers";

const TILE_URL =
  "https://api.thunderforest.com/neighbourhood/{z}/{x}/{y}{r}.png?apikey=0f64302472524b558aa92ebe1c088f04";
const TILE_ATTR =
  '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

type MapHandle = { invalidateSize: () => void };

interface MapWebProps {
  location: { latitude: number; longitude: number } | null;
}

export default forwardRef<MapHandle, MapWebProps>(function MapWeb({ location }, ref) {
  const containerRef = useRef<View | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const userMarkerRef = useRef<LeafletMarker | null>(null);
  const locationRef = useRef(location);
  locationRef.current = location;

  useImperativeHandle(ref, () => ({
    invalidateSize: () => mapRef.current?.invalidateSize(),
  }));

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (typeof window === "undefined") return;

    const container = containerRef.current as unknown as HTMLElement;
    if (!container) return;

    let map: LeafletMap | null = null;

    import("leaflet").then((L) => {
      const currentLoc = locationRef.current;
      const initialCenter: [number, number] = currentLoc
        ? [currentLoc.latitude, currentLoc.longitude]
        : [UNSW_CENTER.lat, UNSW_CENTER.lng];

      map = L.map(container, {
        center: initialCenter,
        zoom: 19,
        minZoom: 18,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTR,
        maxZoom: 22,
        maxNativeZoom: 21,
      }).addTo(map);

      for (const poi of DEMO_POIS) {
        L.marker([poi.lat, poi.lng], {
          icon: toLeafletIcon(createPOIMarker(poi.title)),
        })
          .addTo(map)
          .bindPopup(`<strong>${poi.title}</strong><br/>${poi.description}`);
      }

      const avatarUrl = Asset.fromModule(require("@/assets/images/avatar.png")).uri;
      const userMarker = L.marker(initialCenter, {
        icon: toLeafletIcon(createUserAvatarMarker(avatarUrl)),
      }).addTo(map);

      userMarkerRef.current = userMarker;
      mapRef.current = map;
    });

    return () => {
      map?.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !userMarkerRef.current || !location) return;

    const { latitude, longitude } = location;
    mapRef.current.setView([latitude, longitude], mapRef.current.getZoom(), {
      animate: true,
    });
    userMarkerRef.current.setLatLng([latitude, longitude]);
  }, [location]);

  return <View ref={containerRef} style={styles.container} />;
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
});
