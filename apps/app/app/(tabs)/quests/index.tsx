import { Screen } from "@/components/Screen";
import { StyleSheet, Text } from "react-native";
import { colors, fonts } from "@/app/theme";

export default function QuestsScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Quests</Text>
      <Text style={styles.subtitle}>Quests coming soon</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 34,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: 18,
    textAlign: "center",
  },
});
