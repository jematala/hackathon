import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { fonts } from "@/app/theme";

const HUD_BUTTON_SIZE = 100;
const COLOR_FG = "#5b7559";
const XP_COLOR = "#4A90D9";
const RING_SIZE = HUD_BUTTON_SIZE + 10;
const RING_STROKE = 3;

// progress: float between 0 and 1
function makeXpRingUri(progress: number): string {
  const r = (RING_SIZE - RING_STROKE) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${RING_SIZE}" height="${RING_SIZE}" viewBox="0 0 ${RING_SIZE} ${RING_SIZE}">
    <circle cx="${RING_SIZE / 2}" cy="${RING_SIZE / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="${RING_STROKE}"/>
    <circle cx="${RING_SIZE / 2}" cy="${RING_SIZE / 2}" r="${r}" fill="none" stroke="${XP_COLOR}" stroke-width="${RING_STROKE}"
      stroke-dasharray="${circ}" stroke-dashoffset="${offset}" transform="rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})" stroke-linecap="round"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function ProfileButton() {
  return (
    <View style={styles.leftSection}>
      <Text style={styles.levelLabel}>lv22</Text>

      <View style={styles.profileWrapper}>
        <Image source={{ uri: makeXpRingUri(0.72) }} style={styles.xpRing} />
        <Pressable
          onPress={() => router.push("/profile" as any)}
          style={({ pressed }) => [styles.profileButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Image source={require("@/assets/images/avatar.png")} style={styles.profileImage} />
        </Pressable>
      </View>
    </View>
  );
}

function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.textButton, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Text style={styles.textLabel}>{label}</Text>
    </Pressable>
  );
}

type MapHUDProps = {
  onStudioPress: () => void;
};

export function MapHUD({ onStudioPress }: MapHUDProps) {
  return (
    <View style={styles.container}>
      <ProfileButton />
      <View style={styles.rightCluster}>
        <TextButton label="Quests" onPress={() => router.push("/quests" as any)} />
        <View style={{ width: 10 }} />
        <TextButton label="Studio" onPress={onStudioPress} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
    bottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    left: 15,
    position: "absolute",
    right: 15,
  },
  leftSection: {
    flexDirection: "column",
    alignItems: "center",
  },
  profileWrapper: {
    alignItems: "center",
    height: RING_SIZE,
    justifyContent: "center",
    width: RING_SIZE,
  },
  xpRing: {
    height: RING_SIZE,
    position: "absolute",
    width: RING_SIZE,
  },
  profileButton: {
    alignItems: "center",
    borderColor: COLOR_FG,
    borderRadius: HUD_BUTTON_SIZE / 2,
    borderWidth: 3,
    elevation: 8,
    height: HUD_BUTTON_SIZE,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    width: HUD_BUTTON_SIZE,
  },
  profileImage: {
    borderRadius: HUD_BUTTON_SIZE / 2 - 3,
    height: HUD_BUTTON_SIZE - 6,
    width: HUD_BUTTON_SIZE - 6,
  },
  textButton: {
    alignItems: "center",
    backgroundColor: COLOR_FG,
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  textLabel: {
    color: "#ffedd6",
    fontFamily: fonts.family,
    fontSize: 28,
  },
  levelLabel: {
    color: "#5b7559",
    fontFamily: fonts.family,
    fontSize: 36,
    alignSelf: "center",
  },
  rightCluster: {
    flexDirection: "row",
    alignSelf: "flex-end",
  },
});
