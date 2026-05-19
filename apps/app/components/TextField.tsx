import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { fonts } from "@/app/theme";

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
    color: "#6A401A",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: fonts.family,
  },
  input: {
    backgroundColor: "#FFF5E6",
    borderColor: "#B17833",
    borderRadius: 8,
    borderWidth: 1,
    color: "#6A401A",
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: 12,
    fontFamily: fonts.family,
  },
});
