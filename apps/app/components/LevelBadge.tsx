import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, pixelBorder } from "@/app/theme";

type LevelBadgeProps = {
  level: number;
};

export function LevelBadge({ level }: LevelBadgeProps) {
  return (
    <View style={styles.badge}>
      <Text style={styles.level}>Lv.{level}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.accent,
    ...pixelBorder,
    borderColor: colors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  level: {
    color: colors.white,
    fontSize: fonts.sizes.sm,
    fontFamily: fonts.family,
    fontWeight: "700",
  },
});
