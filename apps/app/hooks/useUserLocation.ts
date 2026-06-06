import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

export interface UserLocation {
  latitude: number;
  longitude: number;
  heading: number | null;
  accuracy: number | null;
}

export interface PositionError {
  code: number;
  message: string;
}

function getLocationErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    if ("code" in error) {
      const posError = error as PositionError;
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

  const clearTimeoutRef = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const stopWatching = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    setIsTracking(false);
    clearTimeoutRef();
  }, []);

  const startWatching = useCallback(async () => {
    stopWatching();
    setLocationError(null);
    setLocationLoading(true);

    try {
      const lastPos = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
      if (lastPos) {
        setLocation({
          latitude: lastPos.coords.latitude,
          longitude: lastPos.coords.longitude,
          heading: lastPos.coords.heading,
          accuracy: lastPos.coords.accuracy,
        });
        setLocationLoading(false);
      }
    } catch {
      // getLastKnownPositionAsync rarely throws; non-fatal
    }

    const markLocationReceived = () => {
      setLocationLoading(false);
      setLocationError(null);
      clearTimeoutRef();
    };

    try {
      const currentPos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        latitude: currentPos.coords.latitude,
        longitude: currentPos.coords.longitude,
        heading: currentPos.coords.heading,
        accuracy: currentPos.coords.accuracy,
      });
      markLocationReceived();
    } catch (e) {
      setLocationError(getLocationErrorMessage(e));
      setLocationLoading(false);
    }

    try {
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
          markLocationReceived();
        },
        (errorMessage) => {
          setLocationError(errorMessage || "Location tracking encountered an error.");
        },
      );

      subscriptionRef.current = sub;
    } catch (e) {
      setLocationError(getLocationErrorMessage(e));
      setLocationLoading(false);
    }

    timeoutRef.current = setTimeout(() => {
      if (!location) {
        setLocationError(
          "Unable to access your location. Please check your browser's location settings.",
        );
        setLocationLoading(false);
      }
    }, 30000);
  }, [stopWatching, location]);

  const requestPermission = useCallback(async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    setPermission(perm);
    if (perm.granted) {
      await startWatching();
    }
    return perm;
  }, [startWatching]);

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
