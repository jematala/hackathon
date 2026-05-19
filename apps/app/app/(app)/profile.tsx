import { Screen } from "@/components/Screen";
import { StyleSheet, Text } from "react-native";

export default function ProfileScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Coming soon…</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: "#6A401A",
    fontFamily: "Jersey10",
    fontSize: 34,
  },
  subtitle: {
    color: "#71730E",
    fontFamily: "Jersey10",
    fontSize: 18,
  },
});
