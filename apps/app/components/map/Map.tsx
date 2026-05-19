import { forwardRef } from "react";
import { Platform } from "react-native";
import MapNative from "./Map.native";
import MapWeb from "./Map.web";

export default forwardRef<{ invalidateSize: () => void }>(function Map(_props, ref) {
  if (Platform.OS !== "web") {
    return <MapNative />;
  } else {
    return <MapWeb ref={ref} />;
  }
});
