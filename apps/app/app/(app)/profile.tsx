import { Screen } from "@/components/Screen";
import { StyleSheet, Text } from "react-native";
import { colors, fonts } from "@/app/theme";

export default function ProfileScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Coming soon...</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 34,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: 18,
  },
});
