import { StyleSheet, Text } from "react-native";

import { fonts } from "@/app/theme";
import { colors } from "@/lib/theme";

export function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return <Text style={styles.text}>{message}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: colors.authError,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.sm,
    marginTop: 8,
    textAlign: "center",
  },
});
