import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/app/theme";
import { CreateStickerPanel } from "@/components/CreateStickerPanel";
import { Screen } from "@/components/Screen";

export default function StudioScreen() {
  const goHome = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(app)/map" as any);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back to map"
          onPress={goHome}
          style={({ pressed }) => [styles.homeButton, pressed && styles.pressed]}
        >
          <ChevronLeft color={colors.white} size={18} />
          <Text style={styles.homeLabel}>home</Text>
        </Pressable>
        <Text style={styles.title}>Studio</Text>
      </View>

      <View style={styles.wrap}>
        <CreateStickerPanel onClose={goHome} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
  },
  homeButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    borderRadius: 8,
    borderWidth: 2,
    flexDirection: "row",
    gap: 4,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  homeLabel: {
    color: colors.white,
    fontFamily: fonts.family,
    fontSize: 22,
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.72,
  },
  title: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.family,
    fontSize: 40,
    textAlign: "right",
  },
  wrap: {
    alignSelf: "center",
    maxWidth: 430,
    width: "100%",
  },
});
