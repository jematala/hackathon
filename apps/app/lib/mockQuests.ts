import type { ClaimQuestResponse, ListQuestsResponse } from "@repo/shared";

export type MockPerksResponse = {
  unlocked: Array<{
    levelPerkId: string;
    perk: { id: string; name: string; description: string };
  }>;
  next: Array<{
    id: string;
    perk: { id: string; name: string; description: string };
  }>;
};

const NOW = "2026-05-20T12:00:00.000Z";
const TODAY = "2026-05-20";

export const mockQuestsResponse: ListQuestsResponse = {
  level: 4,
  streak: 7,
  dailyQuest: {
    id: "11111111-1111-4111-8111-111111111111",
    progressCount: 2,
    targetCount: 3,
    completedAt: null,
    claimableAt: null,
    claimedAt: null,
    claimedXp: null,
    quest: {
      id: "22222222-2222-4222-8222-222222222222",
      source: "daily_quest",
      sourceId: "22222222-2222-4222-8222-222222222222",
      title: "Visit 3 new spots today",
      description: "Drop by 3 points of interest you haven't seen yet.",
      targetCount: 3,
      xpReward: 0,
      activeOn: TODAY,
      template: {
        id: "33333333-3333-4333-8333-333333333333",
        key: "daily_visit_pois",
        triggerType: "visit_pois",
        titleTemplate: "Visit 3 new spots today",
        descriptionTemplate: "Drop by 3 points of interest you haven't seen yet.",
        minTarget: 1,
        maxTarget: 5,
        xpReward: 0,
        active: true,
      },
    },
  },
  levelQuests: [
    {
      id: "44444444-4444-4444-8444-444444444444",
      progressCount: 5,
      targetCount: 5,
      completedAt: NOW,
      claimableAt: NOW,
      claimedAt: null,
      claimedXp: null,
      quest: {
        id: "55555555-5555-4555-8555-555555555555",
        source: "level_quest",
        sourceId: "55555555-5555-4555-8555-555555555555",
        title: "Leave 5 billboards",
        description: "Post a billboard at 5 locations to share your discoveries.",
        targetCount: 5,
        xpReward: 120,
        level: 4,
        sortOrder: 1,
        template: {
          id: "66666666-6666-4666-8666-666666666666",
          key: "lvl_leave_billboards",
          triggerType: "leave_billboards",
          titleTemplate: "Leave 5 billboards",
          descriptionTemplate: "Post a billboard at 5 locations to share your discoveries.",
          minTarget: 3,
          maxTarget: 10,
          xpReward: 120,
          active: true,
        },
      },
    },
    {
      id: "77777777-7777-4777-8777-777777777777",
      progressCount: 1,
      targetCount: 4,
      completedAt: null,
      claimableAt: null,
      claimedAt: null,
      claimedXp: null,
      quest: {
        id: "88888888-8888-4888-8888-888888888888",
        source: "level_quest",
        sourceId: "88888888-8888-4888-8888-888888888888",
        title: "Place 4 stickers",
        description: "Decorate the city — stick 4 stickers anywhere on the map.",
        targetCount: 4,
        xpReward: 80,
        level: 4,
        sortOrder: 2,
        template: {
          id: "99999999-9999-4999-8999-999999999999",
          key: "lvl_place_stickers",
          triggerType: "place_stickers",
          titleTemplate: "Place 4 stickers",
          descriptionTemplate: "Decorate the city — stick 4 stickers anywhere on the map.",
          minTarget: 2,
          maxTarget: 8,
          xpReward: 80,
          active: true,
        },
      },
    },
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      progressCount: 3,
      targetCount: 3,
      completedAt: "2026-05-19T18:30:00.000Z",
      claimableAt: "2026-05-19T18:30:00.000Z",
      claimedAt: "2026-05-19T18:35:00.000Z",
      claimedXp: 60,
      quest: {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        source: "level_quest",
        sourceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        title: "Receive 3 replies",
        description: "Get 3 people to reply to your billboards.",
        targetCount: 3,
        xpReward: 60,
        level: 4,
        sortOrder: 3,
        template: {
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          key: "lvl_receive_replies",
          triggerType: "receive_replies",
          titleTemplate: "Receive 3 replies",
          descriptionTemplate: "Get 3 people to reply to your billboards.",
          minTarget: 1,
          maxTarget: 5,
          xpReward: 60,
          active: true,
        },
      },
    },
  ],
};

export const mockPerksResponse: MockPerksResponse = {
  unlocked: [
    {
      levelPerkId: "perk-unlock-1",
      perk: {
        id: "perk-1",
        name: "Sticker Pack: Sunset",
        description: "A warm set of stickers unlocked at level 2.",
      },
    },
    {
      levelPerkId: "perk-unlock-2",
      perk: {
        id: "perk-2",
        name: "Billboard Frame: Wood",
        description: "A rustic wooden frame for your billboards.",
      },
    },
  ],
  next: [
    {
      id: "perk-next-1",
      perk: {
        id: "perk-3",
        name: "Sticker Pack: Neon",
        description: "Glow-up stickers waiting at level 5.",
      },
    },
  ],
};

export function buildMockClaimResponse(
  questId: string,
  alreadyClaimedIds: Set<string>,
): ClaimQuestResponse {
  const quest =
    mockQuestsResponse.levelQuests.find((q) => q.id === questId) ??
    (mockQuestsResponse.dailyQuest && mockQuestsResponse.dailyQuest.id === questId
      ? mockQuestsResponse.dailyQuest
      : null);

  const xpAwarded = quest?.quest.xpReward ?? 0;
  const levelBefore = mockQuestsResponse.level;

  const afterClaimIds = new Set([...alreadyClaimedIds, questId]);
  const allLevelQuestsClaimed = mockQuestsResponse.levelQuests.every(
    (q) => q.claimedAt !== null || afterClaimIds.has(q.id),
  );
  const levelAfter = allLevelQuestsClaimed ? levelBefore + 1 : levelBefore;

  const baseProgress = quest ?? mockQuestsResponse.levelQuests[0];

  return {
    quest: {
      ...baseProgress,
      claimedAt: NOW,
      claimedXp: xpAwarded,
    },
    xpAwarded,
    levelBefore,
    levelAfter,
    unlockedPerkIds: ["perk-unlock-1"],
  };
}
