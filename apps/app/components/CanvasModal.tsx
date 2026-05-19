import { Modal, StyleSheet, View } from "react-native";
import { CreateStickerPanel } from "@/components/CreateStickerPanel";

export function CanvasModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <CreateStickerPanel onClose={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.5)",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    alignSelf: "center",
    maxWidth: 430,
    width: "100%",
  },
});
