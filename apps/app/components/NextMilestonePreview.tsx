import { StyleSheet, Text, View } from "react-native";

import { fonts } from "@/app/theme";

import { Card } from "./Card";

const MILESTONES: Array<{ day: number; description: string }> = [
  { day: 3, description: "Signature A unlocks" },
  { day: 7, description: "Signature B unlocks" },
  { day: 14, description: "+1 concurrent billboard" },
  { day: 30, description: "Signature C unlocks" },
];

type Props = { currentStreak: number };

export function NextMilestonePreview({ currentStreak }: Props) {
  const next = MILESTONES.find((m) => m.day > currentStreak);

  if (!next) {
    return (
      <Card>
        <Text style={styles.label}>All streak milestones earned!</Text>
      </Card>
    );
  }

  const daysToGo = next.day - currentStreak;

  return (
    <Card>
      <View style={styles.row}>
        <Text style={styles.label}>
          Day {next.day} reward · {daysToGo} day{daysToGo === 1 ? "" : "s"} away
        </Text>
        <Text style={styles.perk}>{next.description}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 2,
  },
  label: {
    color: "#D94A29",
    fontFamily: fonts.family,
    fontSize: 16,
  },
  perk: {
    color: "#6A401A",
    fontFamily: fonts.family,
    fontSize: 20,
  },
});
