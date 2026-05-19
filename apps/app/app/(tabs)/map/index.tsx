import { Screen } from "@/components/Screen";
import { StyleSheet, Text } from "react-native";
import { colors, fonts } from "@/app/theme";

export default function MapScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Map</Text>
      <Text style={styles.subtitle}>Map coming soon</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 34,
    textAlign: "center",
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: 18,
    textAlign: "center",
  },
});
