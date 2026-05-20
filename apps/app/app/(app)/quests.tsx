import type { ClaimQuestResponse, QuestProgress } from "@repo/shared";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { LevelUpOverlay, type LevelUpPerk } from "@/components/LevelUpOverlay";
import { NextLevelPreview } from "@/components/NextLevelPreview";
import { NextMilestonePreview } from "@/components/NextMilestonePreview";
import { QuestCard } from "@/components/QuestCard";
import { Screen } from "@/components/Screen";
import { ApiError } from "@/lib/api/client";
import { useClaimQuest, useQuests, useUserProgress } from "@/lib/api/hooks";

export default function QuestsScreen() {
  const router = useRouter();
  const [levelUp, setLevelUp] = useState<ClaimQuestResponse | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const quests = useQuests();
  const userProgress = useUserProgress();
  const claimQuest = useClaimQuest();

  const handleClaim = (questId: string) => {
    setClaimingId(questId);
    setClaimError(null);
    claimQuest.mutate(questId, {
      onSuccess: (response) => {
        if (response.levelAfter > response.levelBefore) {
          setLevelUp(response);
        }
      },
      onError: (err) => {
        setClaimError(err instanceof ApiError ? err.message : "Could not claim this quest.");
      },
      onSettled: () => {
        setClaimingId(null);
      },
    });
  };

  const levelUpPerks = useMemo<LevelUpPerk[]>(() => {
    if (!levelUp) return [];
    const ids = new Set(levelUp.unlockedPerkIds);
    return (userProgress.data?.unlockedPerks ?? [])
      .filter((entry) => ids.has(entry.levelPerkId))
      .map((entry) => ({
        id: entry.levelPerkId,
        name: entry.perk.name,
        description: entry.perk.description,
      }));
  }, [levelUp, userProgress.data?.unlockedPerks]);

  const dailyQuest = quests.data?.dailyQuest ?? null;
  const levelQuests = quests.data?.levelQuests ?? [];
  const level = quests.data?.level ?? userProgress.data?.level ?? 1;
  const streak = quests.data?.streak ?? userProgress.data?.dailyStreak ?? 0;

  const goHome = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(app)/map" as any);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={goHome} style={styles.backButton}>
          <Text style={styles.backArrow}>{"<"}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Quests</Text>
        <View style={styles.streakPill}>
          <Text style={styles.streakValue}>{streak}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
        </View>
      </View>

      {quests.isLoading ? (
        <Card>
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#5b7559" />
            <Text style={styles.emptyText}>Loading quests...</Text>
          </View>
        </Card>
      ) : null}

      {quests.isError ? (
        <Card>
          <Text style={styles.errorText}>
            {(quests.error as Error | undefined)?.message ?? "Could not load quests."}
          </Text>
        </Card>
      ) : null}

      {claimError ? (
        <Card>
          <Text style={styles.errorText}>{claimError}</Text>
        </Card>
      ) : null}

      {!quests.isLoading && !quests.isError ? (
        <>
          <Section title="Daily Quest">
            {dailyQuest ? (
              <>
                <QuestCard
                  isClaiming={claimingId === dailyQuest.id}
                  onClaim={handleClaim}
                  progress={dailyQuest as QuestProgress}
                />
                <NextMilestonePreview currentStreak={streak} />
              </>
            ) : (
              <Card>
                <Text style={styles.emptyText}>No daily quest today. Check back tomorrow!</Text>
              </Card>
            )}
          </Section>

          <Section title={`Level ${level} Quests`}>
            {levelQuests.length > 0 ? (
              levelQuests.map((quest) => (
                <QuestCard
                  isClaiming={claimingId === quest.id}
                  key={quest.id}
                  onClaim={handleClaim}
                  progress={quest as QuestProgress}
                />
              ))
            ) : (
              <Card>
                <Text style={styles.emptyText}>
                  All caught up — new quests will appear after the next rotation.
                </Text>
              </Card>
            )}
            <NextLevelPreview currentLevel={level} />
          </Section>
        </>
      ) : null}

      <LevelUpOverlay
        levelAfter={levelUp?.levelAfter ?? level}
        levelBefore={levelUp?.levelBefore ?? level}
        onDismiss={() => setLevelUp(null)}
        perks={levelUpPerks}
        visible={levelUp !== null}
      />
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backButton: {
    paddingRight: 8,
  },
  backArrow: {
    color: "#6A401A",
    fontFamily: "Jersey10",
    fontSize: 40,
  },
  headerTitle: {
    color: "#6A401A",
    fontFamily: "Jersey10",
    fontSize: 40,
    flex: 1,
  },
  streakPill: {
    alignItems: "center",
    backgroundColor: "#FFF5E6",
    borderColor: "#B17833",
    borderRadius: 8,
    borderWidth: 2,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  streakValue: {
    color: "#D94A29",
    fontFamily: "Jersey10",
    fontSize: 28,
  },
  streakLabel: {
    color: "#6A401A",
    fontFamily: "Jersey10",
    fontSize: 18,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: "#5b7559",
    fontFamily: "Jersey10",
    fontSize: 26,
  },
  sectionBody: {
    gap: 12,
  },
  emptyText: {
    color: "#71730E",
    fontFamily: "Jersey10",
    fontSize: 18,
  },
  errorText: {
    color: "#D94A29",
    fontFamily: "Jersey10",
    fontSize: 18,
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
});
