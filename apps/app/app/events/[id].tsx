import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen>
      <Text style={styles.title}>Event details</Text>
      <Card>
        <Text style={styles.label}>Route parameter</Text>
        <Text style={styles.value}>{id}</Text>
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
