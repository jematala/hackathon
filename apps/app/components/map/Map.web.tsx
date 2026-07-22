import { Asset } from "expo-asset";
import L from "leaflet";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { UNSW_CENTER } from "@/constants/coordinates";
import { useCurrentUser } from "@/lib/api/hooks";
import { avatarBase64ToUri, useUserProfile } from "@/lib/userProfile";

import type { MapPoi, MapProps } from "./Map.types";
import { createBillboardIcon, createPOIIcon, createUserAvatarIcon } from "./markers";

const DRAWN_AVATAR_BG = "#faf7ef";

const TILE_URL =
  "https://api.thunderforest.com/neighbourhood/{z}/{x}/{y}{r}.png?apikey=0f64302472524b558aa92ebe1c088f04";
const TILE_ATTR =
  '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

type MapHandle = { invalidateSize: () => void };

export const Map = forwardRef<MapHandle, MapProps>(function MapWeb(
  { location, billboards, onBillboardPress, onPoiCheckIn, pois },
  ref,
) {
  const containerRef = useRef<View | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const currentUser = useCurrentUser();
  const localProfile = useUserProfile();
  const avatarUri = avatarBase64ToUri(currentUser.data?.avatarBase64) ?? localProfile.avatarUri;
  // Keep callbacks and location current without rebuilding Leaflet for unrelated renders.
  const locationRef = useRef(location);
  const onBillboardPressRef = useRef(onBillboardPress);
  const onPoiCheckInRef = useRef(onPoiCheckIn);
  locationRef.current = location;
  onBillboardPressRef.current = onBillboardPress;
  onPoiCheckInRef.current = onPoiCheckIn;

  useImperativeHandle(ref, () => ({
    invalidateSize: () => mapRef.current?.invalidateSize(),
  }));

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (typeof window === "undefined") return;

    const container = containerRef.current as unknown as HTMLElement;
    if (!container) return;

    const here = locationRef.current;
    const center: [number, number] = here
      ? [here.latitude, here.longitude]
      : [UNSW_CENTER.lat, UNSW_CENTER.lng];

    const map = L.map(container, {
      center,
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
        .bindPopup(createPoiPopupContent(poi, (id) => onPoiCheckInRef.current?.(id)));
    }

    for (const billboard of billboards) {
      L.marker([billboard.lat, billboard.lng], {
        icon: createBillboardIcon(billboard.title),
      })
        .addTo(map)
        .on("click", () => onBillboardPressRef.current?.(billboard.id));
    }

    const fallbackUrl = Asset.fromModule(require("@/assets/images/avatar.png")).uri;
    const useDrawn = Boolean(avatarUri);
    userMarkerRef.current = L.marker(center, {
      icon: createUserAvatarIcon(avatarUri ?? fallbackUrl, useDrawn ? DRAWN_AVATAR_BG : undefined),
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
    };
  }, [billboards, pois]);

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

function createPoiPopupContent(poi: MapPoi, onPoiCheckIn?: (id: string) => void): HTMLElement {
  const root = document.createElement("div");
  root.style.minWidth = "180px";
  root.style.color = "#3E3528";
  root.style.fontFamily = "Jersey10_400Regular, Jersey10, sans-serif";

  const title = document.createElement("strong");
  title.textContent = poi.title;
  title.style.display = "block";
  title.style.fontSize = "18px";
  root.appendChild(title);

  if (poi.description) {
    const description = document.createElement("p");
    description.textContent = poi.description;
    description.style.fontSize = "15px";
    description.style.lineHeight = "1.15";
    description.style.margin = "6px 0 10px";
    root.appendChild(description);
  }

  const button = document.createElement("button");
  button.type = "button";
  button.disabled = Boolean(poi.visited);
  button.textContent = poi.visited ? "Checked in" : "Check in";
  button.style.background = poi.visited ? "#9FB287" : "#4D5E40";
  button.style.border = "2px solid #384730";
  button.style.borderRadius = "10px";
  button.style.color = "#F2EAD3";
  button.style.cursor = poi.visited ? "default" : "pointer";
  button.style.fontFamily = "inherit";
  button.style.fontSize = "17px";
  button.style.opacity = poi.visited ? "0.72" : "1";
  button.style.padding = "8px 12px";
  button.style.width = "100%";
  button.addEventListener("click", () => {
    if (poi.visited) return;
    onPoiCheckIn?.(poi.id);
  });

  root.appendChild(button);
  return root;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
});
