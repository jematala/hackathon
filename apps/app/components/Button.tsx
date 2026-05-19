import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

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
    backgroundColor: "#5b7559",
    borderRadius: 8,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  pressed: {
    opacity: 0.82,
  },
  label: {
    color: "#FEEED5",
    fontFamily: "Jersey10",
    fontSize: 18,
  },
});
