import { Asset } from "expo-asset";
import L from "leaflet";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { DEMO_POIS, UNSW_CENTER } from "@/constants/coordinates";
import { useUserProfile } from "@/lib/userProfile";

import { createBillboardIcon, createPOIIcon, createUserAvatarIcon } from "./markers";

const DRAWN_AVATAR_BG = "#faf7ef";

const TILE_URL =
  "https://api.thunderforest.com/neighbourhood/{z}/{x}/{y}{r}.png?apikey=0f64302472524b558aa92ebe1c088f04";
const TILE_ATTR =
  '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

type MapProps = {
  exampleBillboard: {
    id: string;
    title: string;
    lat: number;
    lng: number;
  };
  billboards: Array<{
    id: string;
    title: string;
    lat: number;
    lng: number;
  }>;
  onBillboardPress?: (id: string) => void;
};

export const Map = forwardRef<{ invalidateSize: () => void }, MapProps>(function Map(
  { billboards, exampleBillboard, onBillboardPress },
  ref,
) {
  const containerRef = useRef<View | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const { avatarUri } = useUserProfile();

  useImperativeHandle(ref, () => ({
    invalidateSize: () => {
      mapRef.current?.invalidateSize();
    },
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

    for (const poi of DEMO_POIS) {
      L.marker([poi.lat, poi.lng], {
        icon: createPOIIcon(poi.title),
      })
        .addTo(map)
        .bindPopup(`<strong>${poi.title}</strong><br/>${poi.description}`);
    }

    L.marker([exampleBillboard.lat, exampleBillboard.lng], {
      icon: createBillboardIcon(exampleBillboard.title),
    })
      .addTo(map)
      .on("click", () => onBillboardPress?.(exampleBillboard.id));

    for (const billboard of billboards) {
      L.marker([billboard.lat, billboard.lng], {
        icon: createBillboardIcon(billboard.title),
      })
        .addTo(map)
        .on("click", () => onBillboardPress?.(billboard.id));
    }

    const fallbackUrl = Asset.fromModule(require("@/assets/images/avatar.png")).uri;
    const useDrawn = Boolean(avatarUri);
    const initialIcon = createUserAvatarIcon(
      avatarUri ?? fallbackUrl,
      useDrawn ? DRAWN_AVATAR_BG : undefined,
    );

    userMarkerRef.current = L.marker([UNSW_CENTER.lat, UNSW_CENTER.lng], {
      icon: initialIcon,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
    };
    // avatarUri intentionally omitted — avatar updates are handled by the effect below to avoid recreating the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billboards, exampleBillboard, onBillboardPress]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!userMarkerRef.current) return;
    const fallbackUrl = Asset.fromModule(require("@/assets/images/avatar.png")).uri;
    const useDrawn = Boolean(avatarUri);
    userMarkerRef.current.setIcon(
      createUserAvatarIcon(
        avatarUri ?? fallbackUrl,
        useDrawn ? DRAWN_AVATAR_BG : undefined,
      ),
    );
  }, [avatarUri]);

  return <View ref={containerRef} style={styles.container} />;
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
});
