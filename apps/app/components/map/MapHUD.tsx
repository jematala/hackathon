import { router } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { fonts } from "@/app/theme";
import { useUserProfile } from "@/lib/userProfile";

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
  const { avatarUri } = useUserProfile();
  const useDrawn = Boolean(avatarUri);
  const source = avatarUri ? { uri: avatarUri } : require("@/assets/images/avatar.png");
  return (
    <View style={styles.leftSection}>
      <Text style={styles.levelLabel}>lv22</Text>

      <View style={styles.profileWrapper}>
        <Image source={{ uri: makeXpRingUri(0.72) }} style={styles.xpRing} />
        <Pressable
          onPress={() => router.push("/profile" as any)}
          style={({ pressed }) => [styles.profileButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Image
            source={source}
            style={[styles.profileImage, useDrawn && styles.profileImageDrawn]}
          />
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

function AddButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Create billboard"
      style={({ pressed }) => [styles.addButton, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Text style={styles.addLabel}>+</Text>
    </Pressable>
  );
}

type MapHUDProps = {
  onCreateBillboard: () => void;
  isPermissionDenied?: boolean;
  onEnableLocation?: () => void;
  locationError?: string | null;
  locationLoading?: boolean;
};

export function MapHUD({
  onCreateBillboard,
  isPermissionDenied,
  onEnableLocation,
  locationError,
  locationLoading,
}: MapHUDProps) {
  return (
    <View style={styles.container}>
      {locationLoading && (
        <View style={styles.loadingBanner}>
          <ActivityIndicator color={styles.loadingText.color} />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      )}
      {isPermissionDenied && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>Enable location to see nearby quests & POIs</Text>
          <Pressable
            onPress={onEnableLocation}
            style={({ pressed }) => [styles.permissionButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.permissionButtonText}>Enable</Text>
          </Pressable>
        </View>
      )}
      {!isPermissionDenied && locationError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{locationError}</Text>
          {Platform.OS !== "web" && (
            <Pressable
              onPress={() => Linking.openSettings()}
              style={({ pressed }) => [styles.errorButton, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={styles.errorButtonText}>Settings</Text>
            </Pressable>
          )}
        </View>
      )}
      <View style={styles.bottomRow}>
        <ProfileButton />
        <View style={styles.rightStack}>
          <AddButton onPress={onCreateBillboard} />
          <View style={styles.rightCluster}>
            <TextButton label="Quests" onPress={() => router.push("/quests" as any)} />
            <View style={{ width: 10 }} />
            <TextButton label="Studio" onPress={() => router.push("/studio" as any)} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 15,
    right: 15,
    bottom: 15,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#5b7559",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 10,
  },
  permissionText: {
    color: "#ffedd6",
    fontFamily: fonts.family,
    fontSize: 16,
    flex: 1,
  },
  permissionButton: {
    backgroundColor: "#ffedd6",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginLeft: 12,
  },
  permissionButtonText: {
    color: "#5b7559",
    fontFamily: fonts.family,
    fontSize: 18,
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
  profileImageDrawn: {
    backgroundColor: "#faf7ef",
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
  addButton: {
    alignItems: "center",
    backgroundColor: COLOR_FG,
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  addLabel: {
    color: "#ffedd6",
    fontFamily: fonts.family,
    fontSize: 36,
    lineHeight: 38,
  },
  loadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#5b7559",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 10,
  },
  loadingText: {
    color: "#ffedd6",
    fontFamily: fonts.family,
    fontSize: 16,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#8B3A3A",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 10,
  },
  errorText: {
    color: "#ffedd6",
    fontFamily: fonts.family,
    fontSize: 16,
    flex: 1,
  },
  errorButton: {
    backgroundColor: "#ffedd6",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginLeft: 12,
  },
  errorButtonText: {
    color: "#8B3A3A",
    fontFamily: fonts.family,
    fontSize: 18,
  },
  levelLabel: {
    color: "#5b7559",
    fontFamily: fonts.family,
    fontSize: 36,
    alignSelf: "center",
  },
  rightCluster: {
    alignSelf: "flex-end",
    flexDirection: "row",
  },
  rightStack: {
    alignItems: "flex-end",
    alignSelf: "flex-end",
    gap: 10,
  },
});
