import { useLocalSearchParams } from "expo-router";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { ThemedText } from "@/components/ThemedText";
import { StyleSheet, Text } from "react-native";
import { colors, fonts } from "@/app/theme";

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen>
      <ThemedText type="title">Event details</ThemedText>
      <Card>
        <Text style={styles.label}>Route parameter</Text>
        <Text style={styles.value}>{id}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    fontFamily: fonts.family,
  },
  value: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    fontFamily: fonts.family,
  },
});
