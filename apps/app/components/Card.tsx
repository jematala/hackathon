import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { colors } from "@/app/theme";

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.parchment,
    borderColor: colors.borderDark,
    borderRadius: 0,
    borderWidth: 2,
    gap: 12,
    padding: 16,
  },
});
