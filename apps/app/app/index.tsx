import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useDevUser } from "@/lib/devUser";
import { colors } from "@/lib/theme";

const DEMO_BILLBOARD_ID = "00000000-0000-4000-8000-000000000b01";

export default function HomeScreen() {
  const { user, users, setUserId } = useDevUser();

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>UNSW · pixel social</Text>
            <Text style={styles.title}>Campus Connect</Text>
          </View>
          <View style={styles.pillStack}>
            <Text style={styles.pillLabel}>dev user</Text>
            <View style={styles.pillGroup}>
              {users.map((u) => {
                const active = u.id === user.id;
                return (
                  <Pressable
                    key={u.id}
                    onPress={() => setUserId(u.id)}
                    style={[styles.pill, active ? styles.pillActive : null]}
                  >
                    <Text style={[styles.pillText, active ? styles.pillTextActive : null]}>
                      {u.displayName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
        <Text style={styles.subtitle}>
          A cosy bulletin board for the UNSW campus. Pin paper notes and pixel-art stickers around
          town.
        </Text>
      </View>

      <View style={styles.ctaCard}>
        <Text style={styles.ctaTitle}>See a whiteboard</Text>
        <Text style={styles.ctaBody}>
          Take a look at the demo bulletin board — pin your own paper note, drag it anywhere on the
          cork.
        </Text>
        <Link href={`/billboard/${DEMO_BILLBOARD_ID}`} asChild>
          <Button label="Open the demo whiteboard" />
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 14,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    gap: 6,
  },
  eyebrow: {
    color: colors.sageDark,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: colors.ink,
    fontSize: 40,
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  subtitle: {
    color: colors.inkSoft,
    fontSize: 17,
    lineHeight: 22,
  },
  pillStack: {
    alignItems: "flex-end",
    gap: 6,
  },
  pillLabel: {
    color: colors.sageDark,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  pillGroup: {
    backgroundColor: colors.pageBgSoft,
    borderColor: colors.sageDark,
    borderRadius: 999,
    borderWidth: 2,
    flexDirection: "row",
    padding: 3,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillActive: {
    backgroundColor: colors.sageDark,
  },
  pillText: {
    color: colors.sageDark,
    fontSize: 14,
    letterSpacing: 0.4,
  },
  pillTextActive: {
    color: colors.creamText,
  },
  ctaCard: {
    backgroundColor: colors.pageBgSoft,
    borderColor: colors.sageDark,
    borderRadius: 14,
    borderWidth: 3,
    gap: 12,
    padding: 20,
  },
  ctaTitle: {
    color: colors.ink,
    fontSize: 24,
    letterSpacing: 0.2,
  },
  ctaBody: {
    color: colors.inkSoft,
    fontSize: 16,
    lineHeight: 22,
  },
});
