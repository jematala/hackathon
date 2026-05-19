import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "@/lib/theme";

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
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDarker,
    borderWidth: 2,
  },
  subtle: {
    backgroundColor: colors.pageBgSoft,
    borderColor: colors.sageDark,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.82,
  },
  label: {
    fontSize: 18,
    letterSpacing: 0.6,
  },
  labelPrimary: {
    color: colors.creamText,
  },
  labelSubtle: {
    color: colors.sageDark,
  },
});
