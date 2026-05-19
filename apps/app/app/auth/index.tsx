import { Screen } from "@/components/Screen";
import { StyleSheet, Text } from "react-native";

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
    fontFamily: "Jersey10",
    fontSize: 16,
  },
});
