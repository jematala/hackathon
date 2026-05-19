import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";

import { colors } from "@/lib/theme";

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
        placeholderTextColor={colors.inkSofter}
        selectionColor={colors.sageDark}
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
    color: colors.sageDark,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: colors.pageBgSoft,
    borderColor: colors.sage,
    borderRadius: 10,
    borderWidth: 2,
    color: colors.ink,
    fontSize: 18,
    minHeight: 46,
    paddingHorizontal: 14,
  },
});
