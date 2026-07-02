import { StyleSheet, Text } from "react-native";

import { colors as appColors, fonts } from "@/app/theme";

export function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return <Text style={styles.text}>{message}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: appColors.danger,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.sm,
    marginTop: 8,
    textAlign: "center",
  },
});
