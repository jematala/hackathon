import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors, fonts } from "@/app/theme";
import { colors as authColors } from "@/lib/theme";

type ButtonVariant = "primary" | "subtle" | "sage";

type ButtonProps = {
  label: string;
  variant?: ButtonVariant;
} & ComponentProps<typeof Pressable>;

export function Button({ label, style, variant = "primary", ...props }: ButtonProps) {
  const isSubtle = variant === "subtle";
  const isSage = variant === "sage";
  return (
    <Pressable
      style={(state) => {
        // hovered exists on react-native-web only; RN core types omit it
        const { hovered, pressed } = state as { pressed: boolean; hovered?: boolean };
        return [
          styles.button,
          isSage ? styles.sage : isSubtle ? styles.subtle : styles.primary,
          isSage && (pressed || hovered) ? styles.sageActive : null,
          !isSage && pressed ? styles.pressed : null,
          typeof style === "function" ? style(state) : style,
        ];
      }}
      {...props}
    >
      <Text
        style={[
          styles.label,
          isSage ? styles.labelSage : isSubtle ? styles.labelSubtle : styles.labelPrimary,
        ]}
      >
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
  sage: {
    backgroundColor: authColors.authSage,
    borderColor: authColors.authSage,
    borderRadius: 6,
    minHeight: 56,
    minWidth: 190,
  },
  sageActive: {
    backgroundColor: authColors.authSageDark,
    borderColor: authColors.authSageDark,
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
  labelSage: {
    color: authColors.authCream,
    fontSize: fonts.sizes.xl,
  },
});
