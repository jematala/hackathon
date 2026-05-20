import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors, fonts } from "@/app/theme";

type ButtonVariant = "primary" | "subtle";

type ButtonProps = {
  label: string;
  variant?: ButtonVariant;
} & ComponentProps<typeof Pressable>;

export function Button({ label, style, variant = "primary", ...props }: ButtonProps) {
  const isSubtle = variant === "subtle";
  return (
    <Pressable
      style={(state) => [
        styles.button,
        isSubtle ? styles.subtle : styles.primary,
        state.pressed ? styles.pressed : null,
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      <Text style={[styles.label, isSubtle ? styles.labelSubtle : styles.labelPrimary]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 0,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  subtle: {
    backgroundColor: colors.card,
    borderColor: colors.primaryDark,
  },
  pressed: {
    opacity: 0.82,
  },
  label: {
    fontFamily: fonts.family,
    fontSize: fonts.sizes.md,
    fontWeight: "700",
  },
  labelPrimary: {
    color: colors.white,
  },
  labelSubtle: {
    color: colors.primaryDark,
  },
});
