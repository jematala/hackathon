import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

export interface UserLocation {
  latitude: number;
  longitude: number;
  heading: number | null;
  accuracy: number | null;
}

function getLocationErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    if ("code" in error) {
      const posError = error as { code: number };
      switch (posError.code) {
        case 2:
          return "Turn on geolocation in your browser settings to see nearby quests & POIs";
        case 3:
          return "Could not get your location. Please try again.";
      }
    }
    if ("message" in error && typeof (error as { message: string }).message === "string") {
      return (error as { message: string }).message;
    }
  }
  return "Unable to access your location. Please check your browser's location settings.";
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [permission, setPermission] = useState<Location.LocationPermissionResponse | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationReceivedRef = useRef(false);
  const cancelledRef = useRef(false);

  const clearTimeoutRef = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const stopWatching = useCallback(() => {
    try {
      subscriptionRef.current?.remove();
    } catch {
      // On web, expo-location's EventEmitter may not support removeSubscription
    }
    subscriptionRef.current = null;
    setIsTracking(false);
    clearTimeoutRef();
  }, []);

  const startWatching = useCallback(async () => {
    stopWatching();
    setLocationError(null);
    setLocationLoading(true);
    locationReceivedRef.current = false;

    const onLocationReceived = (loc: Location.LocationObject) => {
      if (cancelledRef.current) return;
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        heading: loc.coords.heading,
        accuracy: loc.coords.accuracy,
      });
      locationReceivedRef.current = true;
      setIsTracking(true);
      setLocationLoading(false);
      setLocationError(null);
      clearTimeoutRef();
    };

    try {
      const lastPos = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
      if (lastPos) {
        setLocation({
          latitude: lastPos.coords.latitude,
          longitude: lastPos.coords.longitude,
          heading: lastPos.coords.heading,
          accuracy: lastPos.coords.accuracy,
        });
        locationReceivedRef.current = true;
        setLocationLoading(false);
      }
    } catch {
      // non-fatal
    }

    try {
      const timeoutPromise = new Promise<Location.LocationObject>((_, reject) => {
        setTimeout(() => reject({ code: 3, message: "Location request timed out" }), 10000);
      });
      const currentPos = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        timeoutPromise,
      ]);
      onLocationReceived(currentPos);
    } catch (e) {
      if (!locationReceivedRef.current) {
        setLocationError(getLocationErrorMessage(e));
        setLocationLoading(false);
      }
    }

    try {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 5,
        },
        (loc) => onLocationReceived(loc),
        (errorMessage) => {
          if (!locationReceivedRef.current) {
            setLocationError(errorMessage || "Location tracking encountered an error.");
          }
        },
      );
      subscriptionRef.current = sub;
    } catch (e) {
      if (!locationReceivedRef.current) {
        setLocationError(getLocationErrorMessage(e));
        setLocationLoading(false);
      }
    }

    timeoutRef.current = setTimeout(() => {
      if (!locationReceivedRef.current) {
        setLocationError(
          "Unable to access your location. Please check your browser's location settings.",
        );
        setLocationLoading(false);
      }
    }, 30000);
  }, [stopWatching]);

  const requestPermission = useCallback(async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    setPermission(perm);
    if (perm.granted) {
      await startWatching();
    }
    return perm;
  }, [startWatching]);

  useEffect(() => {
    cancelledRef.current = false;

    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (cancelledRef.current) return;
      setPermission(perm);

      if (perm.granted) {
        await startWatching();
      }
    })();

    return () => {
      cancelledRef.current = true;
      stopWatching();
    };
  }, [startWatching, stopWatching]);

  const isDenied = permission !== null && !permission.granted && !permission.canAskAgain;
  const canAskAgain = permission?.canAskAgain ?? true;

  return {
    location,
    locationError,
    locationLoading,
    isDenied,
    canAskAgain,
    permission,
    isTracking,
    requestPermission,
  };
}
