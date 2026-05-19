import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { StyleSheet, Text } from "react-native";
import { colors, fonts } from "@/app/theme";

export default function BillboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen>
      <Text style={styles.title}>Billboard</Text>
      <Text style={styles.id}>{id}</Text>
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
  id: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: 16,
    textAlign: "center",
  },
});
