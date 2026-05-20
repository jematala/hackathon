import { forwardRef } from "react";
import { Platform } from "react-native";
import MapNative from "./Map.native";
import MapWeb from "./Map.web";

export type MapHandle = { invalidateSize: () => void };

export type MapProps = {
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

export const Map = forwardRef<MapHandle, MapProps>(function Map(props, ref) {
  if (Platform.OS !== "web") {
    return <MapNative />;
  }

  return <MapWeb {...props} ref={ref} />;
});

export default Map;
