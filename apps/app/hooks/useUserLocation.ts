import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";

export interface UserLocation {
  latitude: number;
  longitude: number;
  heading: number | null;
  accuracy: number | null;
}

const isWeb = Platform.OS === "web";

// Browser defaults are `timeout: Infinity, maximumAge: 0` — a cold load can
// hang forever and can never be satisfied by a cached fix. Be explicit.
const WEB_POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 30000,
};

const DENIED_PERMISSION: Location.LocationPermissionResponse = {
  status: Location.PermissionStatus.DENIED,
  granted: false,
  canAskAgain: false,
  expires: "never",
};

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [permission, setPermission] = useState<Location.LocationPermissionResponse | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const stopWatching = () => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    setIsTracking(false);
  };

  const startWatching = async () => {
    stopWatching();
    setError(null);

    const onPosition = (coords: UserLocation) => {
      setLocation(coords);
      setIsTracking(true);
      setError(null);
    };

    if (isWeb) {
      // watchPosition itself triggers the browser prompt, so there's no
      // permission probe here to burn a first fix that we'd throw away.
      const watchId = navigator.geolocation.watchPosition(
        (pos) =>
          onPosition({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            heading: pos.coords.heading,
            accuracy: pos.coords.accuracy,
          }),
        (err) => {
          setIsTracking(false);
          setError(err.message || `geolocation error ${err.code}`);
          if (err.code === err.PERMISSION_DENIED) setPermission(DENIED_PERMISSION);
        },
        WEB_POSITION_OPTIONS,
      );
      subscriptionRef.current = { remove: () => navigator.geolocation.clearWatch(watchId) };
      return;
    }

    const lastPos = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
    if (lastPos) {
      setLocation({
        latitude: lastPos.coords.latitude,
        longitude: lastPos.coords.longitude,
        heading: lastPos.coords.heading,
        accuracy: lastPos.coords.accuracy,
      });
    }

    subscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 5,
      },
      (loc) =>
        onPosition({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          heading: loc.coords.heading,
          accuracy: loc.coords.accuracy,
        }),
      (reason) => {
        setIsTracking(false);
        setError(String(reason));
      },
    );
  };

  // Native only: on web this probe acquires (and discards) a whole fix with
  // no PositionOptions, and Safari rejects it outright.
  const requestForeground = async () => {
    try {
      return await Location.requestForegroundPermissionsAsync();
    } catch {
      return null;
    }
  };

  const requestPermission = async () => {
    if (isWeb) {
      setPermission(null);
      await startWatching();
      return null;
    }
    const perm = await requestForeground();
    setPermission(perm);
    if (!perm || perm.granted) {
      await startWatching();
    }
    return perm;
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (isWeb) {
        await startWatching();
        return;
      }

      const perm = await requestForeground();
      if (cancelled) return;
      setPermission(perm);

      if (!perm || perm.granted) {
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
    error,
    isDenied,
    canAskAgain,
    permission,
    isTracking,
    requestPermission,
  };
}
