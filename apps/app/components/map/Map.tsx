import { forwardRef } from "react";
import { Platform } from "react-native";
import MapNative from "./Map.native";
import MapWeb from "./Map.web";

export type MapHandle = { invalidateSize: () => void };

export type MapPoint = {
  id: string;
  title: string;
  lat: number;
  lng: number;
};

export type MapPoi = MapPoint & {
  description?: string | null;
  visited?: boolean;
};

export type MapProps = {
  billboards: MapPoint[];
  onBillboardPress?: (id: string) => void;
  pois: MapPoi[];
};

export const Map = forwardRef<MapHandle, MapProps>(function Map(props, ref) {
  if (Platform.OS !== "web") {
    return <MapNative {...props} ref={ref} />;
  }

  return <MapWeb {...props} ref={ref} />;
});

export default Map;
