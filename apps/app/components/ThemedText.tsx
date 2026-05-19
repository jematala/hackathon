import type { PropsWithChildren } from "react";
import { StyleSheet, Text, type TextProps } from "react-native";

import { colors } from "@/app/theme";

type ThemedTextProps = TextProps & {
  type?: "title" | "link" | "default";
};

export function ThemedText({
  type = "default",
  style,
  children,
  ...props
}: PropsWithChildren<ThemedTextProps>) {
  return (
    <Text
      style={[
        styles.default,
        type === "title" && styles.title,
        type === "link" && styles.link,
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  default: {
    color: colors.text,
    fontSize: 16,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
  },
  link: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
});
