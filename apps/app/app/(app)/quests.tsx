import type { ClaimQuestResponse, QuestProgress } from "@repo/shared";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { LevelUpOverlay, type LevelUpPerk } from "@/components/LevelUpOverlay";
import { NextLevelPreview } from "@/components/NextLevelPreview";
import { NextMilestonePreview } from "@/components/NextMilestonePreview";
import { QuestCard } from "@/components/QuestCard";
import { Screen } from "@/components/Screen";
import { buildMockClaimResponse, mockPerksResponse, mockQuestsResponse } from "@/lib/mockQuests";

export default function QuestsScreen() {
  const router = useRouter();
  const [levelUp, setLevelUp] = useState<ClaimQuestResponse | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());

  const questsData = useMemo(() => {
    const apply = (q: QuestProgress): QuestProgress =>
      claimedIds.has(q.id)
        ? { ...q, claimedAt: new Date().toISOString(), claimedXp: q.quest.xpReward }
        : q;

    return {
      ...mockQuestsResponse,
      dailyQuest: mockQuestsResponse.dailyQuest ? apply(mockQuestsResponse.dailyQuest) : null,
      levelQuests: mockQuestsResponse.levelQuests.map(apply),
    };
  }, [claimedIds]);

  const perksData = mockPerksResponse;

  const handleClaim = (questId: string) => {
    setClaimingId(questId);
    setTimeout(() => {
      const response = buildMockClaimResponse(questId, claimedIds);
      setClaimedIds((prev) => {
        const next = new Set(prev);
        next.add(questId);
        return next;
      });
      setClaimingId(null);
      if (response.levelAfter > response.levelBefore) {
        setLevelUp(response);
      }
    }, 400);
  };

  const levelUpPerks = useMemo<LevelUpPerk[]>(() => {
    if (!levelUp) return [];
    const ids = new Set(levelUp.unlockedPerkIds);
    return perksData.unlocked
      .filter((entry) => ids.has(entry.levelPerkId))
      .map((entry) => ({
        id: entry.levelPerkId,
        name: entry.perk.name,
        description: entry.perk.description,
      }));
  }, [levelUp, perksData]);

  const { dailyQuest, levelQuests, level, streak } = questsData;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.push("/map" as any)} style={styles.backButton}>
          <Text style={styles.backArrow}>{"<"}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Quests</Text>
        <View style={styles.streakPill}>
          <Text style={styles.streakValue}>{streak}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
        </View>
      </View>

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
});
