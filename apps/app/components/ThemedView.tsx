import type { PropsWithChildren } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { colors } from "@/app/theme";

export function ThemedView({ style, children, ...props }: PropsWithChildren<ViewProps>) {
  return (
    <View style={[styles.view, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  view: {
    backgroundColor: colors.background,
  },
});
