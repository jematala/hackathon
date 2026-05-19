import { useCallback, useRef } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";

import { Map } from "@/components/map/Map";
import { MapHUD } from "@/components/map/MapHUD";

export default function MapScreen() {
  const mapRef = useRef<{ invalidateSize: () => void }>(null);

  const onLayout = useCallback((_e: LayoutChangeEvent) => {
    mapRef.current?.invalidateSize();
  }, []);

  return (
    <View style={styles.root} onLayout={onLayout}>
      <Map ref={mapRef} />
      <MapHUD />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
