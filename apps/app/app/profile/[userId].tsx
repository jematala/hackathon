import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { colors, fonts } from "@/app/theme";

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
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 28,
    fontWeight: "700",
  },
  label: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  value: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 18,
    fontWeight: "700",
  },
});
