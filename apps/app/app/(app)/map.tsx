import { useCallback, useRef, useState } from "react";
import { LayoutChangeEvent, Linking, StyleSheet, View } from "react-native";

import Map from "@/components/map/Map";
import { CanvasModal } from "@/components/CanvasModal";
import { MapHUD } from "@/components/map/MapHUD";
import { useUserLocation } from "@/hooks/useUserLocation";

export default function MapScreen() {
  const mapRef = useRef<{ invalidateSize: () => void }>(null);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const { location, isDenied, canAskAgain, requestPermission } = useUserLocation();

  const onLayout = useCallback((_event: LayoutChangeEvent) => {
    mapRef.current?.invalidateSize();
  }, []);

  const handleEnableLocation = useCallback(async () => {
    if (canAskAgain) {
      await requestPermission();
    } else {
      Linking.openURL("app-settings:");
    }
  }, [canAskAgain, requestPermission]);

  return (
    <View style={styles.root} onLayout={onLayout}>
      <Map ref={mapRef} location={location} />
      <MapHUD
        onStudioPress={() => setIsCanvasOpen(true)}
        isPermissionDenied={isDenied}
        onEnableLocation={handleEnableLocation}
      />
      <CanvasModal visible={isCanvasOpen} onClose={() => setIsCanvasOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
