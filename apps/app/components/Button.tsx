import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fonts } from "@/app/theme";

type ButtonProps = {
  label: string;
} & ComponentProps<typeof Pressable>;

export function Button({ label, style, ...props }: ButtonProps) {
  return (
    <Pressable
      style={(state) => [
        styles.button,
        state.pressed ? styles.pressed : null,
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 0,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: colors.primaryDark,
  },
  pressed: {
    opacity: 0.82,
  },
  label: {
    color: colors.white,
    fontSize: fonts.sizes.md,
    fontWeight: "700",
    fontFamily: fonts.family,
  },
});
