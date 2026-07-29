import { useCallback, useEffect, useRef, useState } from "react";

import { UNSW_CENTER } from "@/constants/coordinates";
import { type UserLocation, useUserLocation } from "@/hooks/useUserLocation";

const M_PER_DEG_LAT = 111_320;
// A real fix inside this radius means the user is actually on campus.
const REAL_GPS_RADIUS_M = 5_000;
// Keep the virtual walker inside the tiles that actually have content.
const ROAM_RADIUS_M = 1_200;

const CENTER: UserLocation = {
  latitude: UNSW_CENTER.lat,
  longitude: UNSW_CENTER.lng,
  heading: null,
  accuracy: null,
};

function mPerDegLng(lat: number): number {
  return M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

function metresFromCenter(lat: number, lng: number): number {
  return Math.hypot(
    (lat - UNSW_CENTER.lat) * M_PER_DEG_LAT,
    (lng - UNSW_CENTER.lng) * mPerDegLng(lat),
  );
}

/**
 * Demo wrapper around `useUserLocation`: starts the user at UNSW so the map is
 * right on first paint, and lets them walk with `moveBy`. A real fix near
 * campus takes over automatically; a far-away one is ignored.
 */
export function useVirtualLocation() {
  const real = useUserLocation();
  const [isVirtual, setIsVirtual] = useState(true);
  const [virtualLocation, setVirtualLocation] = useState<UserLocation>(CENTER);
  const userOverrode = useRef(false);

  const realLocation = real.location;
  useEffect(() => {
    if (userOverrode.current || !realLocation) return;
    setIsVirtual(
      metresFromCenter(realLocation.latitude, realLocation.longitude) > REAL_GPS_RADIUS_M,
    );
  }, [realLocation]);

  const setVirtual = useCallback((on: boolean) => {
    userOverrode.current = true;
    setIsVirtual(on);
  }, []);

  const moveBy = useCallback((dLatMeters: number, dLngMeters: number) => {
    setVirtualLocation((pos) => {
      const lat = pos.latitude + dLatMeters / M_PER_DEG_LAT;
      const lng = pos.longitude + dLngMeters / mPerDegLng(lat);
      const north = (lat - UNSW_CENTER.lat) * M_PER_DEG_LAT;
      const east = (lng - UNSW_CENTER.lng) * mPerDegLng(lat);
      const distance = Math.hypot(north, east);
      if (distance <= ROAM_RADIUS_M) {
        return { ...pos, latitude: lat, longitude: lng };
      }
      const scale = ROAM_RADIUS_M / distance;
      return {
        ...pos,
        latitude: UNSW_CENTER.lat + (north * scale) / M_PER_DEG_LAT,
        longitude: UNSW_CENTER.lng + (east * scale) / mPerDegLng(lat),
      };
    });
  }, []);

  return {
    location: isVirtual ? virtualLocation : real.location,
    isDenied: real.isDenied,
    canAskAgain: real.canAskAgain,
    requestPermission: real.requestPermission,
    isVirtual,
    moveBy,
    setVirtual,
  };
}
