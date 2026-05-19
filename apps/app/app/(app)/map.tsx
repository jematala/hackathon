import { useCallback, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";

import { CanvasModal } from "@/components/CanvasModal";
import { Map } from "@/components/map/Map";
import { MapHUD } from "@/components/map/MapHUD";

export default function MapScreen() {
  const mapRef = useRef<{ invalidateSize: () => void }>(null);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);

  const onLayout = useCallback((_event: LayoutChangeEvent) => {
    mapRef.current?.invalidateSize();
  }, []);

  return (
    <View style={styles.root} onLayout={onLayout}>
      <Map ref={mapRef} />
      <MapHUD onStudioPress={() => setIsCanvasOpen(true)} />
      <CanvasModal visible={isCanvasOpen} onClose={() => setIsCanvasOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
