import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF5E6",
    borderColor: "#B17833",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
});
