import type { QuestProgress } from "@repo/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fonts } from "@/app/theme";

import { Card } from "./Card";
import { ProgressBar } from "./ProgressBar";

type QuestCardProps = {
  progress: QuestProgress;
  onClaim: (id: string) => void;
  isClaiming: boolean;
};

export function QuestCard({ progress, onClaim, isClaiming }: QuestCardProps) {
  const { quest, claimedAt, claimableAt, progressCount, targetCount } = progress;
  const claimed = Boolean(claimedAt);
  const claimable = Boolean(claimableAt) && !claimed;
  const isDaily = quest.source === "daily_quest";
  const claimedLabel = isDaily ? "Claimed · streak +1" : "Claimed";

  return (
    <Card>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={2}>
          {quest.title}
        </Text>
        {isDaily && <Text style={styles.streakReward}>+1 streak</Text>}
      </View>
      <Text style={styles.description}>{quest.description}</Text>
      <ProgressBar value={progressCount} max={targetCount} />
      <View style={styles.actionRow}>
        {claimed ? (
          <View style={styles.claimedPill}>
            <Text style={styles.claimedLabel}>{claimedLabel}</Text>
          </View>
        ) : claimable ? (
          <Pressable
            disabled={isClaiming}
            onPress={() => onClaim(progress.id)}
            style={({ pressed }) => [
              styles.claimButton,
              {
                opacity: isClaiming ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={styles.claimLabel}>{isClaiming ? "Claiming…" : "Claim"}</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    color: "#6A401A",
    flex: 1,
    fontFamily: fonts.family,
    fontSize: 20,
    marginRight: 12,
  },
  streakReward: {
    color: "#D94A29",
    fontFamily: fonts.family,
    fontSize: 16,
  },
  description: {
    color: "#71730E",
    fontFamily: fonts.family,
    fontSize: 16,
  },
  actionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  claimButton: {
    alignItems: "center",
    backgroundColor: "#5A7258",
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  claimLabel: {
    color: "#ffedd6",
    fontFamily: fonts.family,
    fontSize: 18,
  },
  claimedPill: {
    backgroundColor: "#E9D8B5",
    borderColor: "#B17833",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  claimedLabel: {
    color: "#6A401A",
    fontFamily: fonts.family,
    fontSize: 16,
  },
});
