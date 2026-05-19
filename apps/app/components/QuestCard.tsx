import type { QuestProgress } from "@repo/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "./Card";
import { ProgressBar } from "./ProgressBar";

type QuestCardProps = {
  progress: QuestProgress;
  onClaim: (id: string) => void;
  isClaiming: boolean;
};

export function QuestCard({ progress, onClaim, isClaiming }: QuestCardProps) {
  const { quest, claimedAt, claimableAt, progressCount, targetCount, claimedXp } = progress;
  const claimed = Boolean(claimedAt);
  const claimable = Boolean(claimableAt) && !claimed;

  return (
    <Card>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={2}>
          {quest.title}
        </Text>
        <Text style={styles.xp}>+{quest.xpReward} XP</Text>
      </View>
      <Text style={styles.description}>{quest.description}</Text>
      <ProgressBar value={progressCount} max={targetCount} />
      <View style={styles.actionRow}>
        {claimed ? (
          <View style={styles.claimedPill}>
            <Text style={styles.claimedLabel}>
              Claimed{claimedXp != null ? ` · +${claimedXp} XP` : ""}
            </Text>
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
        ) : (
          <Text style={styles.pendingHint}>Keep exploring to make progress.</Text>
        )}
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
    fontFamily: "Jersey10",
    fontSize: 24,
    marginRight: 12,
  },
  xp: {
    color: "#4A90D9",
    fontFamily: "Jersey10",
    fontSize: 22,
  },
  description: {
    color: "#71730E",
    fontFamily: "Jersey10",
    fontSize: 16,
  },
  actionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  claimButton: {
    alignItems: "center",
    backgroundColor: "#5b7559",
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  claimLabel: {
    color: "#ffedd6",
    fontFamily: "Jersey10",
    fontSize: 22,
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
    fontFamily: "Jersey10",
    fontSize: 18,
  },
  pendingHint: {
    color: "#8B7340",
    fontFamily: "Jersey10",
    fontSize: 16,
  },
});
