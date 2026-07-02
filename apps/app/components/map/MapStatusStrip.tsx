import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Flame, Target } from "lucide-react-native";

import { colors, fonts } from "@/app/theme";

const COLOR_FG = "#5b7559";
const COLOR_INK = "#ffedd6";

const DAILY_QUEST = {
  label: "visit 3 POIs",
  current: 1,
  goal: 3,
};
const STREAK = 7;

function formatSydneyTime(date: Date): { label: string; isDay: boolean } {
  const fmt = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const parts = fmt.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value?.toLowerCase() ?? "am";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const label = `${hour}:${minute}${dayPeriod}`;
  const hour24 =
    dayPeriod === "pm" && hour !== 12 ? hour + 12 : dayPeriod === "am" && hour === 12 ? 0 : hour;
  const isDay = hour24 >= 6 && hour24 < 19;
  return { label, isDay };
}

export function MapStatusStrip() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const time = formatSydneyTime(now);
  const progress = Math.min(DAILY_QUEST.current / DAILY_QUEST.goal, 1);

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Pressable
        accessibilityLabel="Open daily quest"
        onPress={() => router.push("/quests" as any)}
        style={({ pressed }) => [styles.questPill, pressed && styles.pressed]}
      >
        <View style={styles.questIcon}>
          <Target color={COLOR_INK} size={14} />
        </View>
        <View style={styles.questBody}>
          <Text style={styles.questLabel} numberOfLines={1}>
            {DAILY_QUEST.label}
          </Text>
          <View style={styles.questBarTrack}>
            <View style={[styles.questBarFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
        <Text style={styles.questCount}>
          {DAILY_QUEST.current}/{DAILY_QUEST.goal}
        </Text>
      </Pressable>

      <View style={styles.rightCluster}>
        <View style={styles.chip}>
          <Flame color={colors.danger} size={14} />
          <Text style={styles.chipLabel}>{STREAK}</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.todIcon}>{time.isDay ? "☀" : "☾"}</Text>
          <Text style={styles.chipLabel}>{time.label}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 10,
    left: 15,
    position: "absolute",
    right: 15,
    top: 15,
    zIndex: 500,
  },
  questPill: {
    alignItems: "center",
    backgroundColor: colors.parchment,
    borderColor: COLOR_FG,
    borderWidth: 2,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    maxWidth: 320,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  questIcon: {
    alignItems: "center",
    backgroundColor: COLOR_FG,
    borderColor: colors.primaryDark,
    borderWidth: 2,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  questBody: {
    flex: 1,
    gap: 3,
  },
  questLabel: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 16,
    lineHeight: 18,
  },
  questBarTrack: {
    backgroundColor: colors.parchmentDark,
    borderColor: colors.borderDark,
    borderWidth: 1,
    height: 6,
    overflow: "hidden",
  },
  questBarFill: {
    backgroundColor: COLOR_FG,
    height: "100%",
  },
  questCount: {
    color: colors.primaryDark,
    fontFamily: fonts.family,
    fontSize: 16,
    minWidth: 26,
    textAlign: "right",
  },
  rightCluster: {
    flexDirection: "row",
    gap: 6,
  },
  chip: {
    alignItems: "center",
    backgroundColor: colors.parchment,
    borderColor: COLOR_FG,
    borderWidth: 2,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  chipLabel: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 16,
  },
  todIcon: {
    color: colors.accent,
    fontFamily: fonts.family,
    fontSize: 16,
  },
  pressed: { opacity: 0.8 },
});
