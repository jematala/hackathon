import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { colors, fonts, pixelBorder } from "@/app/theme";

type TextFieldProps = {
  label: string;
} & TextInputProps;

export function TextField({ label, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput autoCapitalize="none" style={[styles.input, style]} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  label: {
    color: colors.text,
    fontSize: fonts.sizes.sm,
    fontWeight: "700",
    fontFamily: fonts.family,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 0,
    borderWidth: 2,
    color: colors.text,
    fontSize: fonts.sizes.md,
    minHeight: 44,
    paddingHorizontal: 12,
    fontFamily: fonts.family,
  },
});
