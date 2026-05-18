import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();

  return (
    <Screen>
      <Text style={styles.title}>Profile</Text>
      <Card>
        <Text style={styles.label}>User route</Text>
        <Text style={styles.value}>{userId}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "800",
  },
  label: {
    color: "#6b7280",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  value: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
  },
});
