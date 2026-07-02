import type { ComponentProps } from "react";
import { useState } from "react";
import { StyleSheet, TextInput } from "react-native";

import { colors as appColors, fonts } from "@/app/theme";
import { colors } from "@/lib/theme";

type PixelInputProps = {
  hasError?: boolean;
} & ComponentProps<typeof TextInput>;

export function PixelInput({
  hasError = false,
  onBlur,
  onFocus,
  placeholder,
  style,
  ...props
}: PixelInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      placeholder={focused ? undefined : placeholder}
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
    borderColor: appColors.danger,
  },
});
