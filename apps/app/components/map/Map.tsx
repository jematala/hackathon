import { forwardRef } from "react";
import { Platform } from "react-native";
import MapNative from "./Map.native";
import MapWeb from "./Map.web";

export interface MapLocation {
  latitude: number;
  longitude: number;
}

interface MapProps {
  location: MapLocation | null;
}

export default forwardRef<{ invalidateSize: () => void }, MapProps>(function Map(
  { location },
  ref,
) {
  if (Platform.OS !== "web") {
    return <MapNative location={location} />;
  } else {
    return <MapWeb ref={ref} location={location} />;
  }
});
