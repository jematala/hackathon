import { useCallback, useRef, useState } from "react";
import { LayoutChangeEvent, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { BillboardPanel } from "@/components/billboard/BillboardPanel";
import { Map } from "@/components/map/Map";
import { MapHUD } from "@/components/map/MapHUD";

export default function MapScreen() {
  const mapRef = useRef<{ invalidateSize: () => void }>(null);
  const [activeBillboardId, setActiveBillboardId] = useState<string | null>(null);

  const onLayout = useCallback((_event: LayoutChangeEvent) => {
    mapRef.current?.invalidateSize();
  }, []);

  return (
    <View style={styles.root} onLayout={onLayout}>
      <Map ref={mapRef} onBillboardPress={setActiveBillboardId} />
      <MapHUD />
      <Modal
        visible={activeBillboardId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveBillboardId(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setActiveBillboardId(null)} />
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalPanel}>
              <BillboardPanel
                id={activeBillboardId ?? undefined}
                onClose={() => setActiveBillboardId(null)}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(36, 30, 22, 0.55)",
  },
  modalScroll: {
    maxHeight: "92%",
    width: "100%",
  },
  modalScrollContent: {
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  modalPanel: {
    backgroundColor: "#F2EAD3",
    borderColor: "#384730",
    borderRadius: 16,
    borderWidth: 3,
    gap: 18,
    maxWidth: 820,
    padding: 18,
    width: "100%",
  },
});
