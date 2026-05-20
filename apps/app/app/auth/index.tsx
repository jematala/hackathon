import { StyleSheet, Text } from "react-native";

import { fonts } from "@/app/theme";
import { Screen } from "@/components/Screen";

export default function AuthScreen() {
  return (
    <Screen>
      <Text style={styles.text}>Sign in — coming soon</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: {
    color: "#6A401A",
    fontFamily: fonts.family,
    fontSize: 16,
  },
});
