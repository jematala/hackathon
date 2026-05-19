import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { colors } from "@/lib/theme";

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.pageBgSoft,
    borderColor: colors.sage,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
    padding: 18,
  },
});
