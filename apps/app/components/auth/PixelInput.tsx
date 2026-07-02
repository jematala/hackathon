import type { ComponentProps } from "react";
import { StyleSheet, TextInput } from "react-native";

import { fonts } from "@/app/theme";
import { colors } from "@/lib/theme";

type PixelInputProps = {
  hasError?: boolean;
} & ComponentProps<typeof TextInput>;

export function PixelInput({ hasError = false, style, ...props }: PixelInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.authSage}
      style={[styles.input, hasError ? styles.error : null, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.authCream,
    borderColor: colors.authSage,
    borderRadius: 8,
    borderWidth: 2,
    color: colors.authSage,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.md,
    height: 48,
    marginBottom: 12,
    paddingHorizontal: 16,
    textAlign: "center",
  },
  error: {
    borderColor: colors.authError,
  },
});
