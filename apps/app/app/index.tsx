import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { CanvasModal } from "@/components/CanvasModal";

export default function HomeScreen() {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.screen}>
      <View style={styles.map}>
        <View style={[styles.mapBlock, styles.mapBlockTop]} />
        <View style={[styles.mapBlock, styles.mapBlockLeft]} />
        <View style={[styles.mapBlock, styles.mapBlockRight]} />
        <View style={[styles.path, styles.pathHorizontal]} />
        <View style={[styles.path, styles.pathVertical]} />
        <View style={[styles.pin, styles.pinLibrary]}>
          <Text style={styles.pinText}>L</Text>
        </View>
        <View style={[styles.pin, styles.pinQuad]}>
          <Text style={styles.pinText}>Q</Text>
        </View>
        <View style={[styles.pin, styles.pinOval]}>
          <Text style={styles.pinText}>O</Text>
        </View>
      </View>

      <View style={styles.topBar}>
        <View>
          <Text style={styles.eyebrow}>UNSW Connect</Text>
          <Text style={styles.title}>Campus Map</Text>
        </View>
      </View>

      <Pressable style={styles.createFab} onPress={() => setModalVisible(true)}>
        <Text style={styles.createFabIcon}>+</Text>
      </Pressable>

      <View style={styles.bottomPanel}>
        <Text style={styles.panelTitle}>Find people nearby</Text>
        <Text style={styles.panelText}>
          Create a sticker, then place it on the map for your next meetup.
        </Text>
        <Button label="Create Sticker" onPress={() => setModalVisible(true)} />
      </View>

      <CanvasModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#8fbf74",
    flex: 1,
    overflow: "hidden",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#8fbf74",
  },
  mapBlock: {
    backgroundColor: "#6fa45e",
    borderColor: "#4f7d43",
    borderWidth: 2,
    position: "absolute",
  },
  mapBlockTop: {
    borderRadius: 8,
    height: 150,
    left: 24,
    top: 92,
    width: "42%",
  },
  mapBlockLeft: {
    borderRadius: 8,
    bottom: 160,
    height: 170,
    left: 34,
    width: "36%",
  },
  mapBlockRight: {
    borderRadius: 8,
    height: 260,
    right: 28,
    top: 210,
    width: "38%",
  },
  path: {
    backgroundColor: "#d7c08d",
    borderColor: "#a98555",
    borderWidth: 2,
    position: "absolute",
  },
  pathHorizontal: {
    height: 54,
    left: -20,
    right: -20,
    top: "45%",
    transform: [{ rotate: "-8deg" }],
  },
  pathVertical: {
    bottom: -60,
    left: "48%",
    top: 40,
    transform: [{ rotate: "7deg" }],
    width: 50,
  },
  pin: {
    alignItems: "center",
    backgroundColor: "#e95b4f",
    borderColor: "#5f2b24",
    borderRadius: 8,
    borderWidth: 2,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    width: 34,
  },
  pinLibrary: {
    left: "28%",
    top: "31%",
  },
  pinQuad: {
    right: "28%",
    top: "52%",
  },
  pinOval: {
    bottom: "24%",
    left: "42%",
  },
  pinText: {
    color: "#fff8e8",
    fontSize: 15,
    fontWeight: "800",
  },
  topBar: {
    backgroundColor: "rgba(244, 234, 215, 0.92)",
    borderColor: "#5f4a2d",
    borderRadius: 8,
    borderWidth: 2,
    left: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: "absolute",
    right: 20,
    top: 56,
  },
  eyebrow: {
    color: "#2f6b42",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: "#2d2418",
    fontSize: 30,
    fontWeight: "800",
  },
  createFab: {
    alignItems: "center",
    backgroundColor: "#2f6b42",
    borderColor: "#fff8e8",
    borderRadius: 8,
    borderWidth: 3,
    bottom: 154,
    height: 58,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    width: 58,
  },
  createFabIcon: {
    color: "#fff8e8",
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 38,
  },
  bottomPanel: {
    backgroundColor: "rgba(244, 234, 215, 0.95)",
    borderColor: "#5f4a2d",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 2,
    bottom: 0,
    gap: 10,
    left: 0,
    padding: 20,
    position: "absolute",
    right: 0,
  },
  panelTitle: {
    color: "#2d2418",
    fontSize: 22,
    fontWeight: "800",
  },
  panelText: {
    color: "#69563f",
    fontSize: 16,
    lineHeight: 22,
  },
});
