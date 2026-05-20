import { sql } from "drizzle-orm";

import { newId, newIdSql, nowSql, sydneyDateSql } from "../db";
import type { getDb } from "../db";
import { isoDate, isoDateTime, nullableIsoDateTime } from "../serialize";

type Database = ReturnType<typeof getDb>;

export type QuestTriggerType =
  | "leave_billboards"
  | "place_stickers"
  | "receive_replies"
  | "save_stickers"
  | "visit_pois";

type ProgressUpdateRow = {
  claimable: boolean;
  completed: boolean;
  progressCount: number;
  questId: string;
  source: "daily_quest" | "level_quest";
  targetCount: number;
};

type CapacityRow = {
  dailyBillboardLimit: number | null;
  maxConcurrentBillboards: number | null;
  stickerSlots: number | null;
};

export async function ensureQuestProgress(db: Database, userId: string) {
  await db.execute(sql`
    insert into user_quest_progress (id, user_id, source, source_id, target_count)
    select ${newIdSql()}, ${userId}, 'level_quest', level_quest_sets.id, level_quest_sets.target_count
    from users
    join level_quest_sets on level_quest_sets.level = users.level
    where users.id = ${userId}
    on conflict (user_id, source, source_id) where active_on is null do nothing
  `);

  await db.execute(sql`
    insert into user_quest_progress (id, user_id, source, source_id, target_count, active_on)
    select
      ${newIdSql()},
      ${userId},
      'daily_quest',
      daily_quest_pool.id,
      daily_quest_pool.target_count,
      ${sydneyDateSql()}
    from daily_quest_pool
    where daily_quest_pool.active
    on conflict (user_id, source, source_id, active_on) where active_on is not null do nothing
  `);
}

export async function incrementQuestProgress(
  db: Database,
  userId: string,
  triggerType: QuestTriggerType,
  delta = 1,
) {
  await ensureQuestProgress(db, userId);

  const rows = await db.execute<ProgressUpdateRow>(sql`
    with matching_progress as (
      select
        user_quest_progress.id,
        user_quest_progress.progress_count,
        user_quest_progress.target_count
      from user_quest_progress
      left join level_quest_sets
        on user_quest_progress.source = 'level_quest'
        and user_quest_progress.source_id = level_quest_sets.id
      left join quest_templates
        on level_quest_sets.template_id = quest_templates.id
      left join daily_quest_pool
        on user_quest_progress.source = 'daily_quest'
        and user_quest_progress.source_id = daily_quest_pool.id
      left join daily_quest_templates
        on daily_quest_pool.template_id = daily_quest_templates.id
      where
        user_quest_progress.user_id = ${userId}
        and user_quest_progress.claimed_at is null
        and coalesce(quest_templates.trigger_type, daily_quest_templates.trigger_type) = ${triggerType}
    )
    update user_quest_progress
    set
      progress_count = min(
        user_quest_progress.target_count,
        user_quest_progress.progress_count + ${delta}
      ),
      completed_at = case
        when user_quest_progress.completed_at is not null then user_quest_progress.completed_at
        when user_quest_progress.progress_count + ${delta} >= user_quest_progress.target_count then ${nowSql()}
        else null
      end,
      claimable_at = case
        when user_quest_progress.claimable_at is not null then user_quest_progress.claimable_at
        when user_quest_progress.progress_count + ${delta} >= user_quest_progress.target_count then ${nowSql()}
        else null
      end,
      updated_at = ${nowSql()}
    where user_quest_progress.id in (select id from matching_progress)
    returning
      user_quest_progress.id as "questId",
      user_quest_progress.source,
      user_quest_progress.progress_count as "progressCount",
      user_quest_progress.target_count as "targetCount",
      user_quest_progress.completed_at is not null as completed,
      user_quest_progress.claimable_at is not null
        and user_quest_progress.claimed_at is null as claimable
  `);

  return rows;
}

export async function getUserCapacities(db: Database, userId: string) {
  const rows = await db.execute<CapacityRow>(sql`
    with user_level as (
      select level
      from users
      where id = ${userId}
    ),
    level_caps as (
      select
        perk_definitions.key,
        max(level_perks.numeric_value) as cap
      from level_perks
      join perk_definitions on perk_definitions.id = level_perks.perk_id
      cross join user_level
      where
        level_perks.level >= 1
        and level_perks.level <= user_level.level
      group by perk_definitions.key
    ),
    streak_deltas as (
      select
        perk_definitions.key,
        coalesce(sum(level_perks.numeric_value), 0) as delta
      from level_perks
      join perk_definitions on perk_definitions.id = level_perks.perk_id
      join user_perk_unlocks
        on user_perk_unlocks.level_perk_id = level_perks.id
        and user_perk_unlocks.user_id = ${userId}
      where level_perks.level = 0
      group by perk_definitions.key
    )
    select
      (
        coalesce(
          (select cap from level_caps where key = 'max_concurrent_billboards'),
          0
        ) + coalesce(
          (select delta from streak_deltas where key = 'max_concurrent_billboards'),
          0
        )
      )::int as "maxConcurrentBillboards",
      (
        coalesce(
          (select cap from level_caps where key = 'daily_billboard_limit'),
          0
        ) + coalesce(
          (select delta from streak_deltas where key = 'daily_billboard_limit'),
          0
        )
      )::int as "dailyBillboardLimit",
      (
        coalesce(
          (select cap from level_caps where key = 'sticker_slots'),
          0
        ) + coalesce(
          (select delta from streak_deltas where key = 'sticker_slots'),
          0
        )
      )::int as "stickerSlots"
  `);

  const capacities = rows[0];

  return {
    dailyBillboardLimit: capacities?.dailyBillboardLimit ?? 4,
    maxConcurrentBillboards: capacities?.maxConcurrentBillboards ?? 3,
    stickerSlots: capacities?.stickerSlots ?? 10,
  };
}

export function questProgressUpdate(row: ProgressUpdateRow) {
  return {
    claimable: Boolean(row.claimable),
    completed: Boolean(row.completed),
    progressCount: row.progressCount,
    questId: row.questId,
    source: row.source,
    targetCount: row.targetCount,
  };
}

export function questRowToProgress(row: Record<string, unknown>) {
  const source = row.source as "daily_quest" | "level_quest";
  const template = {
    active: Boolean(row.templateActive),
    descriptionTemplate: String(row.templateDescriptionTemplate),
    id: String(row.templateId),
    key: String(row.templateKey),
    maxTarget: Number(row.templateMaxTarget),
    minTarget: Number(row.templateMinTarget),
    titleTemplate: String(row.templateTitleTemplate),
    triggerType: row.templateTriggerType as QuestTriggerType,
    xpReward: Number(row.templateXpReward),
  };
  const quest = {
    description: String(row.description),
    id: String(row.progressId),
    source,
    sourceId: String(row.sourceId),
    targetCount: Number(row.targetCount),
    title: String(row.title),
    xpReward: Number(row.xpReward),
  };

  return {
    claimedAt: nullableIsoDateTime(row.claimedAt as Date | string | null),
    claimedXp: row.claimedXp === null ? null : Number(row.claimedXp),
    claimableAt: nullableIsoDateTime(row.claimableAt as Date | string | null),
    completedAt: nullableIsoDateTime(row.completedAt as Date | string | null),
    id: String(row.progressId),
    progressCount: Number(row.progressCount),
    quest:
      source === "level_quest"
        ? {
            ...quest,
            level: Number(row.level),
            sortOrder: Number(row.sortOrder),
            template,
          }
        : {
            ...quest,
            activeOn: isoDate(row.activeOn as Date | string),
            template,
          },
    targetCount: Number(row.targetCount),
  };
}

export function applyQuestTemplate(template: string, targetCount: number) {
  return template.replaceAll("{target}", String(targetCount));
}

export function rowDateTime(value: unknown) {
  return isoDateTime(value as Date | string);
}

type StreakRewardJson = {
  rewards: Array<
    { type: "signature"; signatureKey: string } | { type: "capacity_billboard"; amount: number }
  >;
};

function parseStreakReward(value: StreakRewardJson | string): StreakRewardJson {
  return typeof value === "string" ? (JSON.parse(value) as StreakRewardJson) : value;
}

export async function applyStreakMilestoneUnlocks(
  db: Database,
  userId: string,
  currentStreak: number,
) {
  const rewardRows = await db.execute<{
    streakDays: number;
    reward: StreakRewardJson | string;
  }>(sql`
    select streak_days as "streakDays", reward
    from streak_reward_definitions
    where active and streak_days = ${currentStreak}
  `);

  for (const row of rewardRows) {
    for (const reward of parseStreakReward(row.reward).rewards) {
      if (reward.type === "signature") {
        await db.execute(sql`
          insert into user_signatures (user_id, signature_id, is_equipped)
          select ${userId}, signatures.id, false
          from signatures
          where signatures.key = ${reward.signatureKey}
          on conflict (user_id, signature_id) do nothing
        `);
      } else if (reward.type === "capacity_billboard") {
        // Streak-derived capacity perks are stored at level=0 in level_perks
        // with metadata.source='streak'. The unique (level, perk_id) means there's
        // exactly one canonical streak-billboard row in the table; each user who
        // crosses day-14 links to it via user_perk_unlocks.
        await db.execute(sql`
          insert into level_perks (id, level, perk_id, numeric_value, metadata)
          select ${newId()}, 0, id, ${reward.amount},
            ${JSON.stringify({ source: "streak", streakDay: row.streakDays })}
          from perk_definitions
          where key = 'max_concurrent_billboards'
          on conflict (level, perk_id) do nothing
        `);
        await db.execute(sql`
          insert into user_perk_unlocks (user_id, level_perk_id, source_level)
          select ${userId}, level_perks.id, 0
          from level_perks
          join perk_definitions on perk_definitions.id = level_perks.perk_id
          where level_perks.level = 0
            and perk_definitions.key = 'max_concurrent_billboards'
          on conflict (user_id, level_perk_id) do nothing
        `);
      }
    }
  }
}
