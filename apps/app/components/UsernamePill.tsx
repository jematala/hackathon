import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, pixelBorder } from "@/app/theme";

type UsernamePillProps = {
  username: string;
};

export function UsernamePill({ username }: UsernamePillProps) {
  return (
    <View style={styles.pill}>
      <Text style={styles.text}>{username}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    ...pixelBorder,
    borderColor: colors.primaryDark,
  },
  text: {
    color: colors.white,
    fontSize: fonts.sizes.xs,
    fontFamily: fonts.family,
    fontWeight: "700",
  },
});
