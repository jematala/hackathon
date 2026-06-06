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

export const Map = forwardRef<MapHandle, MapProps>(function MapWeb(
  { location, billboards, onBillboardPress, pois },
  ref,
) {
  const containerRef = useRef<View | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const { avatarUri } = useUserProfile();

  useImperativeHandle(ref, () => ({
    invalidateSize: () => mapRef.current?.invalidateSize(),
  }));

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (typeof window === "undefined") return;

    const container = containerRef.current as unknown as HTMLElement;
    if (!container) return;

    const map = L.map(container, {
      center: [UNSW_CENTER.lat, UNSW_CENTER.lng],
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

    for (const poi of pois) {
      L.marker([poi.lat, poi.lng], {
        icon: createPOIIcon(poi.title),
      })
        .addTo(map)
        .bindPopup(
          `<strong>${escapeHtml(poi.title)}</strong><br/>${escapeHtml(poi.description ?? "")}`,
        );
    }

    for (const billboard of billboards) {
      L.marker([billboard.lat, billboard.lng], {
        icon: createBillboardIcon(billboard.title),
      })
        .addTo(map)
        .on("click", () => onBillboardPress?.(billboard.id));
    }

    const fallbackUrl = Asset.fromModule(require("@/assets/images/avatar.png")).uri;
    const useDrawn = Boolean(avatarUri);
    userMarkerRef.current = L.marker([UNSW_CENTER.lat, UNSW_CENTER.lng], {
      icon: createUserAvatarIcon(avatarUri ?? fallbackUrl, useDrawn ? DRAWN_AVATAR_BG : undefined),
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
    };
  }, [avatarUri, billboards, onBillboardPress, pois]);

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
