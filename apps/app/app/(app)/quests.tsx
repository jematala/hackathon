import type { ClaimQuestResponse, ListQuestsResponse, QuestProgress } from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { LevelUpOverlay, type LevelUpPerk } from "@/components/LevelUpOverlay";
import { QuestCard } from "@/components/QuestCard";
import { Screen } from "@/components/Screen";
import { apiFetch } from "@/lib/api";

type PerksResponse = {
  unlocked: Array<{
    levelPerkId: string;
    perk: { id: string; name: string; description: string };
  }>;
  next: Array<{
    id: string;
    perk: { id: string; name: string; description: string };
  }>;
};

export default function QuestsScreen() {
  const queryClient = useQueryClient();
  const [levelUp, setLevelUp] = useState<ClaimQuestResponse | null>(null);

  const questsQuery = useQuery({
    queryKey: ["quests"],
    queryFn: () => apiFetch<ListQuestsResponse>("/api/quests"),
  });

  const perksQuery = useQuery({
    queryKey: ["perks"],
    queryFn: () => apiFetch<PerksResponse>("/api/users/me/perks"),
  });

  const claimMutation = useMutation({
    mutationFn: (questId: string) =>
      apiFetch<ClaimQuestResponse>(`/api/quests/${questId}/claim`, {
        body: "{}",
        method: "POST",
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quests"] });
      queryClient.invalidateQueries({ queryKey: ["perks"] });
      if (data.levelAfter > data.levelBefore) {
        setLevelUp(data);
      }
    },
  });

  const levelUpPerks = useMemo<LevelUpPerk[]>(() => {
    if (!levelUp || !perksQuery.data) return [];
    const ids = new Set(levelUp.unlockedPerkIds);
    return perksQuery.data.unlocked
      .filter((entry) => ids.has(entry.levelPerkId))
      .map((entry) => ({
        id: entry.levelPerkId,
        name: entry.perk.name,
        description: entry.perk.description,
      }));
  }, [levelUp, perksQuery.data]);

  if (questsQuery.isPending) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color="#5b7559" size="large" />
        </View>
      </Screen>
    );
  }

  if (questsQuery.isError || !questsQuery.data) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Couldn’t load quests</Text>
          <Text style={styles.errorMessage}>
            {questsQuery.error instanceof Error
              ? questsQuery.error.message
              : "Something went wrong."}
          </Text>
          <Pressable
            onPress={() => questsQuery.refetch()}
            style={({ pressed }) => [styles.retryButton, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const { dailyQuest, levelQuests, level, streak } = questsQuery.data;
  const claimingId = claimMutation.isPending ? claimMutation.variables : null;
  const handleClaim = (id: string) => claimMutation.mutate(id);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quests</Text>
        <View style={styles.streakPill}>
          <Text style={styles.streakValue}>{streak}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
        </View>
      </View>

      <Section title="Daily Quest">
        {dailyQuest ? (
          <QuestCard
            isClaiming={claimingId === dailyQuest.id}
            onClaim={handleClaim}
            progress={dailyQuest as QuestProgress}
          />
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
      </Section>

      {claimMutation.isError ? (
        <Card>
          <Text style={styles.errorMessage}>
            {claimMutation.error instanceof Error
              ? `Couldn’t claim quest: ${claimMutation.error.message}`
              : "Couldn’t claim quest."}
          </Text>
        </Card>
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
  headerTitle: {
    color: "#6A401A",
    fontFamily: "Jersey10",
    fontSize: 40,
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
  center: {
    alignItems: "center",
    gap: 12,
    justifyContent: "center",
    paddingVertical: 60,
  },
  errorTitle: {
    color: "#6A401A",
    fontFamily: "Jersey10",
    fontSize: 26,
  },
  errorMessage: {
    color: "#71730E",
    fontFamily: "Jersey10",
    fontSize: 18,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#5b7559",
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  retryLabel: {
    color: "#ffedd6",
    fontFamily: "Jersey10",
    fontSize: 22,
  },
});
