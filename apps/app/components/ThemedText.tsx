import type { PropsWithChildren } from "react";
import { StyleSheet, Text, type TextProps } from "react-native";
import { colors, fonts } from "@/app/theme";

type ThemedTextProps = TextProps & {
  type?: "title" | "link" | "default" | "heading";
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
        type === "heading" && styles.heading,
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
    fontSize: fonts.sizes.md,
    fontFamily: fonts.family,
  },
  title: {
    color: colors.text,
    fontSize: fonts.sizes.title,
    fontWeight: "700",
    fontFamily: fonts.family,
  },
  link: {
    color: colors.primary,
    fontSize: fonts.sizes.md,
    fontWeight: "600",
    fontFamily: fonts.family,
  },
  heading: {
    color: colors.text,
    fontSize: fonts.sizes.heading,
    fontWeight: "700",
    fontFamily: fonts.family,
  },
});
