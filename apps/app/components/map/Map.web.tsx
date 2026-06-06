import "maplibre-gl/dist/maplibre-gl.css";

import { Asset } from "expo-asset";
import maplibregl from "maplibre-gl";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { UNSW_CENTER } from "@/constants/coordinates";
import { MAP_STYLE } from "@/constants/mapStyle";
import { useUserProfile } from "@/lib/userProfile";

import type { MapProps } from "./Map.types";
import { createBillboardElement, createPOIElement, createUserAvatarElement } from "./markers";

const DRAWN_AVATAR_BG = "#faf7ef";

type MapHandle = { invalidateSize: () => void };

export const Map = forwardRef<MapHandle, MapProps>(function MapWeb(
  { location, billboards, onBillboardPress, pois },
  ref,
) {
  const containerRef = useRef<View | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const { avatarUri } = useUserProfile();
  const avatarUriRef = useRef(avatarUri);
  avatarUriRef.current = avatarUri;

  useImperativeHandle(ref, () => ({
    invalidateSize: () => mapRef.current?.resize(),
  }));

  // Create map once — never torn down on data changes
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (typeof window === "undefined") return;

    const container = containerRef.current as unknown as HTMLElement;
    if (!container) return;

    const map = new maplibregl.Map({
      container,
      style: MAP_STYLE,
      center: [UNSW_CENTER.lng, UNSW_CENTER.lat],
      zoom: 19,
      minZoom: 18,
      attributionControl: false,
    });

    map.once("load", () => map.resize());
    mapRef.current = map;

    return () => {
      for (const m of markersRef.current) {
        m.remove();
      }
      markersRef.current = [];
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Manage POI and billboard markers when data changes
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const map = mapRef.current;
    if (!map) return;

    for (const m of markersRef.current) {
      m.remove();
    }
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    const markers: maplibregl.Marker[] = [];
    let activePopup: maplibregl.Popup | null = null;

    for (const poi of pois) {
      const el = createPOIElement(poi.title);
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([poi.lng, poi.lat])
        .addTo(map);

      const popup = new maplibregl.Popup({ offset: [0, -44] })
        .setHTML(
          `<strong>${escapeHtml(poi.title)}</strong><br/>${escapeHtml(poi.description ?? "")}`,
        )
        .setLngLat([poi.lng, poi.lat]);

      el.addEventListener("click", () => {
        if (activePopup === popup) {
          popup.remove();
          activePopup = null;
          return;
        }
        activePopup?.remove();
        activePopup = popup;
        popup.addTo(map);
      });

      markers.push(marker);
    }

    for (const billboard of billboards) {
      const el = createBillboardElement(billboard.title);
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([billboard.lng, billboard.lat])
        .addTo(map);

      el.addEventListener("click", () => onBillboardPress?.(billboard.id));

      markers.push(marker);
    }

    const fallbackUrl = Asset.fromModule(require("@/assets/images/avatar.png")).uri;
    const currentAvatarUri = avatarUriRef.current;
    const useDrawn = Boolean(currentAvatarUri);
    const userEl = createUserAvatarElement(
      currentAvatarUri ?? fallbackUrl,
      useDrawn ? DRAWN_AVATAR_BG : undefined,
    );
    const userMarker = new maplibregl.Marker({ element: userEl })
      .setLngLat([UNSW_CENTER.lng, UNSW_CENTER.lat])
      .addTo(map);

    userMarkerRef.current = userMarker;
    markersRef.current = markers;
  }, [billboards, pois, onBillboardPress]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!userMarkerRef.current || !mapRef.current) return;

    const fallbackUrl = Asset.fromModule(require("@/assets/images/avatar.png")).uri;
    const useDrawn = Boolean(avatarUri);
    const lngLat = userMarkerRef.current.getLngLat();
    userMarkerRef.current.remove();
    const userEl = createUserAvatarElement(
      avatarUri ?? fallbackUrl,
      useDrawn ? DRAWN_AVATAR_BG : undefined,
    );
    userMarkerRef.current = new maplibregl.Marker({ element: userEl })
      .setLngLat(lngLat)
      .addTo(mapRef.current);
  }, [avatarUri]);

  useEffect(() => {
    if (!mapRef.current || !userMarkerRef.current || !location) return;

    const { latitude, longitude } = location;
    mapRef.current.easeTo({ center: [longitude, latitude] });
    userMarkerRef.current.setLngLat([longitude, latitude]);
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
