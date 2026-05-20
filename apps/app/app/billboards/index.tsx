import { StyleSheet, Text } from "react-native";

import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { colors } from "@/lib/theme";

export default function BillboardsIndexScreen() {
  return (
    <Screen>
      <Card>
        <Text style={styles.eyebrow}>Billboards · index</Text>
        <Text style={styles.title}>Billboards</Text>
        <Text style={styles.body}>
          List view arrives in Stage 2. Stage 1 only wires the route and the API client.
        </Text>
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
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  body: {
    color: colors.inkSoft,
    fontSize: 15,
    lineHeight: 21,
  },
});
