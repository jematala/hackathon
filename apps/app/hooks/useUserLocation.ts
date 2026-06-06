import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

export interface UserLocation {
  latitude: number;
  longitude: number;
  heading: number | null;
  accuracy: number | null;
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [permission, setPermission] = useState<Location.LocationPermissionResponse | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const stopWatching = () => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    setIsTracking(false);
  };

  const startWatching = async () => {
    stopWatching();

    const lastPos = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
    if (lastPos) {
      setLocation({
        latitude: lastPos.coords.latitude,
        longitude: lastPos.coords.longitude,
        heading: lastPos.coords.heading,
        accuracy: lastPos.coords.accuracy,
      });
    }

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 5,
      },
      (loc) => {
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          heading: loc.coords.heading,
          accuracy: loc.coords.accuracy,
        });
        setIsTracking(true);
      },
    );

    subscriptionRef.current = sub;
  };

  const requestPermission = async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    setPermission(perm);
    if (perm.granted) {
      await startWatching();
    }
    return perm;
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      setPermission(perm);

      if (perm.granted) {
        await startWatching();
      }
    })();

    return () => {
      cancelled = true;
      stopWatching();
    };
  }, []);

  const isDenied = permission !== null && !permission.granted && !permission.canAskAgain;
  const canAskAgain = permission?.canAskAgain ?? true;

  return {
    location,
    isDenied,
    canAskAgain,
    permission,
    isTracking,
    requestPermission,
  };
}
