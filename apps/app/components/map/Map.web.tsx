import { Asset } from "expo-asset";
import L from "leaflet";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { UNSW_CENTER } from "@/constants/coordinates";
import { useUserProfile } from "@/lib/userProfile";

import type { MapProps } from "./Map.types";
import { createBillboardIcon, createPOIIcon, createUserAvatarIcon } from "./markers";

const DRAWN_AVATAR_BG = "#faf7ef";

const TILE_URL =
  "https://api.thunderforest.com/neighbourhood/{z}/{x}/{y}{r}.png?apikey=0f64302472524b558aa92ebe1c088f04";
const TILE_ATTR =
  '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

type MapHandle = { invalidateSize: () => void };

const DRAFT_ICON = L.divIcon({
  className: "poi-marker",
  html: `<div class="poi-marker-inner" style="font-size:32px;line-height:32px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.4));">📍</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 30],
});

export const Map = forwardRef<MapHandle, MapProps>(function MapWeb(
  { location, billboards, onBillboardPress, pois, onMapPress, draftPin },
  ref,
) {
  const containerRef = useRef<View | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const draftMarkerRef = useRef<L.Marker | null>(null);
  const poiMarkersRef = useRef<L.Marker[]>([]);
  const billboardMarkersRef = useRef<L.Marker[]>([]);
  const { avatarUri } = useUserProfile();

  // Latest-value refs so the create-once map effect and Leaflet event
  // handlers always see fresh props without re-running the effect.
  const onMapPressRef = useRef(onMapPress);
  onMapPressRef.current = onMapPress;
  const onBillboardPressRef = useRef(onBillboardPress);
  onBillboardPressRef.current = onBillboardPress;
  const locationRef = useRef(location);
  locationRef.current = location;
  const avatarUriRef = useRef(avatarUri);
  avatarUriRef.current = avatarUri;

  useImperativeHandle(ref, () => ({
    invalidateSize: () => mapRef.current?.invalidateSize(),
  }));

  // Create the map exactly once. Marker data must never tear this down —
  // billboards/POIs are managed by their own effects below.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (typeof window === "undefined") return;

    const container = containerRef.current as unknown as HTMLElement;
    if (!container) return;

    const initialCenter = locationRef.current
      ? { lat: locationRef.current.latitude, lng: locationRef.current.longitude }
      : UNSW_CENTER;

    const map = L.map(container, {
      center: [initialCenter.lat, initialCenter.lng],
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

    map.on("click", (e: L.LeafletMouseEvent) => {
      onMapPressRef.current?.(e.latlng.lat, e.latlng.lng);
    });

    const fallbackUrl = Asset.fromModule(require("@/assets/images/avatar.png")).uri;
    const initialAvatar = avatarUriRef.current;
    userMarkerRef.current = L.marker([initialCenter.lat, initialCenter.lng], {
      icon: createUserAvatarIcon(
        initialAvatar ?? fallbackUrl,
        initialAvatar ? DRAWN_AVATAR_BG : undefined,
      ),
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      draftMarkerRef.current = null;
      poiMarkersRef.current = [];
      billboardMarkersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const map = mapRef.current;
    if (!map) return;

    for (const marker of poiMarkersRef.current) marker.remove();
    poiMarkersRef.current = pois.map((poi) =>
      L.marker([poi.lat, poi.lng], {
        icon: createPOIIcon(poi.title),
      })
        .addTo(map)
        .bindPopup(
          `<strong>${escapeHtml(poi.title)}</strong><br/>${escapeHtml(poi.description ?? "")}`,
        ),
    );
  }, [pois]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const map = mapRef.current;
    if (!map) return;

    for (const marker of billboardMarkersRef.current) marker.remove();
    billboardMarkersRef.current = billboards.map((billboard) =>
      L.marker([billboard.lat, billboard.lng], {
        icon: createBillboardIcon(billboard.title),
      })
        .addTo(map)
        .on("click", () => onBillboardPressRef.current?.(billboard.id)),
    );
  }, [billboards]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const map = mapRef.current;
    if (!map) return;

    if (!draftPin) {
      if (draftMarkerRef.current) {
        draftMarkerRef.current.remove();
        draftMarkerRef.current = null;
      }
      return;
    }

    if (draftMarkerRef.current) {
      draftMarkerRef.current.setLatLng([draftPin.lat, draftPin.lng]);
    } else {
      draftMarkerRef.current = L.marker([draftPin.lat, draftPin.lng], {
        icon: DRAFT_ICON,
        zIndexOffset: 1000,
      }).addTo(map);
    }
  }, [draftPin]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!userMarkerRef.current) return;

    const fallbackUrl = Asset.fromModule(require("@/assets/images/avatar.png")).uri;
    const useDrawn = Boolean(avatarUri);
    userMarkerRef.current.setIcon(
      createUserAvatarIcon(avatarUri ?? fallbackUrl, useDrawn ? DRAWN_AVATAR_BG : undefined),
    );
  }, [avatarUri]);

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

export default Map;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
});
