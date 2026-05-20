import {
  claimQuestErrorResponseSchema,
  claimQuestInputSchema,
  claimQuestResponseSchema,
  listQuestsResponseSchema,
} from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { sql } from "drizzle-orm";
import { Hono } from "hono";

import { getDb } from "../db";
import { getAuthUser, requireAuth } from "../middleware/auth";
import { applyStreakMilestoneUnlocks } from "../services/progression";
import type { AppBindings } from "../types";
import { loadQuestRows, loadUser } from "./users";

type ClaimRow = {
  claimedAt: Date | string | null;
  completedAt: Date | string | null;
  source: "daily_quest" | "level_quest";
  xpReward: number;
};

export const questsRoute = new Hono<AppBindings>();

questsRoute.get("/quests", requireAuth, async (c) => {
  const db = getDb(c);
  const authUser = getAuthUser(c);

  const user = await loadUser(c, authUser.id);
  const quests = await loadQuestRows(db, authUser.id);

  return c.json(
    listQuestsResponseSchema.parse({
      dailyQuest: quests.find((quest) => quest.quest.source === "daily_quest") ?? null,
      level: user.level,
      levelQuests: quests.filter((quest) => quest.quest.source === "level_quest"),
      streak: user.dailyStreak,
    }),
  );
});

questsRoute.post(
  "/quests/:id/claim",
  requireAuth,
  zValidator("json", claimQuestInputSchema),
  async (c) => {
    const db = getDb(c);
    const authUser = getAuthUser(c);
    const id = c.req.param("id");
    const rows = await db.execute<ClaimRow>(sql`
      select
        user_quest_progress.source,
        user_quest_progress.completed_at as "completedAt",
        user_quest_progress.claimed_at as "claimedAt",
        case
          when user_quest_progress.source = 'level_quest' then level_quest_sets.xp_reward
          else 0
        end as "xpReward"
      from app.user_quest_progress
      left join app.level_quest_sets
        on user_quest_progress.source = 'level_quest'
        and user_quest_progress.source_id = level_quest_sets.id
      where user_quest_progress.id = ${id} and user_quest_progress.user_id = ${authUser.id}
    `);
    const quest = rows[0];

    if (!quest) {
      return c.json(
        claimQuestErrorResponseSchema.parse({
          error: "quest_not_found",
          message: "Quest progress row was not found.",
        }),
        404,
      );
    }

    if (quest.claimedAt) {
      return c.json(
        claimQuestErrorResponseSchema.parse({
          error: "quest_already_claimed",
          message: "Quest reward has already been claimed.",
        }),
        409,
      );
    }

    if (!quest.completedAt) {
      return c.json(
        claimQuestErrorResponseSchema.parse({
          error: "quest_not_claimable",
          message: "Quest is not complete yet.",
        }),
        409,
      );
    }

    const userBefore = await loadUser(c, authUser.id);

    await db.execute(sql`
      update app.user_quest_progress
      set claimed_at = now(), claimed_xp = ${quest.xpReward}, updated_at = now()
      where id = ${id} and claimed_at is null
    `);
    await db.execute(sql`
      update app.users
      set
        xp = case when ${quest.source} = 'level_quest' then xp + ${quest.xpReward} else xp end,
        last_daily_claimed_on = case
          when ${quest.source} = 'daily_quest' then (timezone('Australia/Sydney', now()))::date
          else last_daily_claimed_on
        end,
        daily_streak = case
          when ${quest.source} = 'daily_quest'
            and (
              last_daily_claimed_on is null
              or last_daily_claimed_on < (timezone('Australia/Sydney', now()))::date
            )
          then daily_streak + 1
          else daily_streak
        end,
        streak_updated_on = case
          when ${quest.source} = 'daily_quest' then (timezone('Australia/Sydney', now()))::date
          else streak_updated_on
        end,
        updated_at = now()
      where id = ${authUser.id}
    `);

    if (quest.source === "daily_quest") {
      const streakRows = await db.execute<{ dailyStreak: number }>(sql`
        select daily_streak as "dailyStreak" from app.users where id = ${authUser.id}
      `);
      const streak = streakRows[0]?.dailyStreak ?? 0;
      await applyStreakMilestoneUnlocks(db, authUser.id, streak);
    }

    if (quest.source === "level_quest") {
      await maybeLevelUp(db, authUser.id);
    }

    const userAfter = await loadUser(c, authUser.id);
    const unlockedRows = await db.execute<{ levelPerkId: string }>(sql`
      select level_perk_id as "levelPerkId"
      from app.user_perk_unlocks
      where user_id = ${authUser.id} and source_level > ${userBefore.level}
      order by source_level, level_perk_id
    `);
    const updatedQuest = (await loadQuestRows(db, authUser.id)).find((item) => item.id === id);

    return c.json(
      claimQuestResponseSchema.parse({
        levelAfter: userAfter.level,
        levelBefore: userBefore.level,
        quest: updatedQuest,
        unlockedPerkIds: unlockedRows.map((row) => row.levelPerkId),
        xpAwarded: quest.xpReward,
      }),
    );
  },
);

async function maybeLevelUp(db: ReturnType<typeof getDb>, userId: string) {
  const pendingRows = await db.execute<{ pending: number }>(sql`
    select count(*)::int as pending
    from app.user_quest_progress
    join app.level_quest_sets on level_quest_sets.id = user_quest_progress.source_id
    join app.users on users.id = user_quest_progress.user_id
    where
      user_quest_progress.user_id = ${userId}
      and user_quest_progress.source = 'level_quest'
      and level_quest_sets.level = users.level
      and user_quest_progress.claimed_at is null
  `);

  if ((pendingRows[0]?.pending ?? 1) > 0) {
    return;
  }

  const leveledRows = await db.execute<{ level: number }>(sql`
    update app.users
    set level = level + 1, updated_at = now()
    where id = ${userId}
    returning level
  `);
  const level = leveledRows[0]?.level;

  if (!level) {
    return;
  }

  await db.execute(sql`
    insert into app.user_perk_unlocks (user_id, level_perk_id, source_level)
    select ${userId}, id, level
    from app.level_perks
    where level <= ${level}
    on conflict (user_id, level_perk_id) do nothing
  `);
}
