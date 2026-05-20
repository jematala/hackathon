import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/app/theme";

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: 16,
    marginHorizontal: "auto",
    maxWidth: 760,
    padding: 20,
    width: "100%",
  },
});
