import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";

import { colors, fonts } from "@/app/theme";

const WEB_NO_OUTLINE = { outlineStyle: "none" } as unknown as { outlineStyle: undefined };

type TextFieldProps = {
  label: string;
} & TextInputProps;

export function TextField({ label, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        placeholderTextColor={colors.textLight}
        selectionColor={colors.primaryDark}
        underlineColorAndroid="transparent"
        style={[styles.input, WEB_NO_OUTLINE, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  label: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.sm,
    fontWeight: "700",
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 0,
    borderWidth: 2,
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.md,
    minHeight: 44,
    paddingHorizontal: 12,
  },
});
