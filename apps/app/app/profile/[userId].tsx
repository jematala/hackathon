import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { colors } from "@/lib/theme";

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();

  return (
    <Screen>
      <Text style={styles.eyebrow}>UNSW · pixel social</Text>
      <Text style={styles.title}>Profile</Text>
      <Card>
        <Text style={styles.label}>User route</Text>
        <Text style={styles.value}>{userId}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: colors.sageDark,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  label: {
    color: colors.sageDark,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  value: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
  },
});
