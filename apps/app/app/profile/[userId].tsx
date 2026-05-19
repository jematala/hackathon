import { useLocalSearchParams } from "expo-router";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { StyleSheet, Text } from "react-native";
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
    fontSize: 28,
    fontWeight: "700",
    fontFamily: fonts.family,
  },
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
