import { Modal, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { CreateStickerPanel } from "@/components/CreateStickerPanel";

export function CanvasModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { height } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ScrollView
          style={[styles.scroll, { maxHeight: Math.max(360, height - 32) }]}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <CreateStickerPanel onClose={onClose} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.5)",
    flex: 1,
    justifyContent: "center",
  },
  scroll: {
    width: "100%",
  },
  scrollContent: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100%",
    padding: 16,
  },
});
