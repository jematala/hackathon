import { Asset } from "expo-asset";
import L from "leaflet";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { UNSW_CENTER } from "@/constants/coordinates";
import { useUserProfile } from "@/lib/userProfile";

import type { MapPoint, MapPoi } from "./Map";
import { createBillboardIcon, createPOIIcon, createUserAvatarIcon } from "./markers";

const DRAWN_AVATAR_BG = "#faf7ef";

const TILE_URL =
  "https://api.thunderforest.com/neighbourhood/{z}/{x}/{y}{r}.png?apikey=0f64302472524b558aa92ebe1c088f04";
const TILE_ATTR =
  '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

type MapHandle = { invalidateSize: () => void };

type MapProps = {
  billboards: MapPoint[];
  onBillboardPress?: (id: string) => void;
  onPoiCheckIn?: (id: string) => void;
  pois: MapPoi[];
};

export const Map = forwardRef<MapHandle, MapProps>(function MapWeb(
  { billboards, onBillboardPress, onPoiCheckIn, pois },
  ref,
) {
  const containerRef = useRef<View | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const billboardMarkersRef = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());
  const poiMarkersRef = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());
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

    const fallbackUrl = Asset.fromModule(require("@/assets/images/avatar.png")).uri;
    userMarkerRef.current = L.marker([UNSW_CENTER.lat, UNSW_CENTER.lng], {
      icon: createUserAvatarIcon(fallbackUrl),
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      billboardMarkersRef.current.clear();
      mapRef.current = null;
      poiMarkersRef.current.clear();
      userMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!mapRef.current) return;

    const nextPoiIds = new Set(pois.map((poi) => poi.id));
    for (const [id, marker] of poiMarkersRef.current) {
      if (!nextPoiIds.has(id)) {
        marker.remove();
        poiMarkersRef.current.delete(id);
      }
    }

    for (const poi of pois) {
      const existingMarker = poiMarkersRef.current.get(poi.id);
      const popupContent = createPoiPopupContent(poi, onPoiCheckIn);

      if (existingMarker) {
        existingMarker.setLatLng([poi.lat, poi.lng]);
        existingMarker.setIcon(createPOIIcon(poi.title));
        existingMarker.bindPopup(popupContent);
        continue;
      }

      const marker = L.marker([poi.lat, poi.lng], {
        icon: createPOIIcon(poi.title),
      })
        .addTo(mapRef.current)
        .bindPopup(popupContent);

      poiMarkersRef.current.set(poi.id, marker);
    }
  }, [onPoiCheckIn, pois]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!mapRef.current) return;

    const nextBillboardIds = new Set(billboards.map((billboard) => billboard.id));
    for (const [id, marker] of billboardMarkersRef.current) {
      if (!nextBillboardIds.has(id)) {
        marker.remove();
        billboardMarkersRef.current.delete(id);
      }
    }

    for (const billboard of billboards) {
      const existingMarker = billboardMarkersRef.current.get(billboard.id);

      if (existingMarker) {
        existingMarker.setLatLng([billboard.lat, billboard.lng]);
        existingMarker.setIcon(createBillboardIcon(billboard.title));
        existingMarker.off("click");
        existingMarker.on("click", () => onBillboardPress?.(billboard.id));
        continue;
      }

      const marker = L.marker([billboard.lat, billboard.lng], {
        icon: createBillboardIcon(billboard.title),
      })
        .addTo(mapRef.current)
        .on("click", () => onBillboardPress?.(billboard.id));

      billboardMarkersRef.current.set(billboard.id, marker);
    }
  }, [billboards, onBillboardPress]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!userMarkerRef.current) return;

    const fallbackUrl = Asset.fromModule(require("@/assets/images/avatar.png")).uri;
    const useDrawn = Boolean(avatarUri);
    userMarkerRef.current.setIcon(
      createUserAvatarIcon(avatarUri ?? fallbackUrl, useDrawn ? DRAWN_AVATAR_BG : undefined),
    );
  }, [avatarUri]);

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
  button.style.padding = "8px 12px";
  button.style.width = "100%";
  button.style.opacity = poi.visited ? "0.72" : "1";
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
