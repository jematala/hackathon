import { StyleSheet, Text, View } from "react-native";

import { fonts } from "@/app/theme";

import { Card } from "./Card";

const LEVEL_PERKS: Record<number, string> = {
  2: "+1 concurrent billboard, +1 billboard/day",
  3: "+2 sticker slots",
  4: "Unlock signature display",
  5: "+1 billboard/day",
  6: "Note border flair",
  7: "+2 sticker slots",
  8: "+1 concurrent billboard, +1 billboard/day",
  9: "Unique sticker palette expansion",
  10: "+1 billboard/day, +2 sticker slots, all flairs",
};

type Props = { currentLevel: number };

export function NextLevelPreview({ currentLevel }: Props) {
  if (currentLevel >= 10) {
    return (
      <Card>
        <Text style={styles.label}>Max level reached</Text>
      </Card>
    );
  }

  const nextLevel = currentLevel + 1;
  const perk = LEVEL_PERKS[nextLevel];

  return (
    <Card>
      <View style={styles.row}>
        <Text style={styles.label}>Level {nextLevel} reward</Text>
        <Text style={styles.perk}>{perk}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 2,
  },
  label: {
    color: "#B17833",
    fontFamily: fonts.family,
    fontSize: 16,
  },
  perk: {
    color: "#6A401A",
    fontFamily: fonts.family,
    fontSize: 20,
  },
});
