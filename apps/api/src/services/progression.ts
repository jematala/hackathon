import { sql } from "drizzle-orm";

import type { getDb } from "../db";
import { isoDateTime, nullableIsoDateTime } from "../serialize";

type Database = Pick<ReturnType<typeof getDb>, "execute">;

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
  source: "level_quest";
  targetCount: number;
};

type CapacityRow = {
  dailyBillboardLimit: number | null;
  maxConcurrentBillboards: number | null;
  stickerSlots: number | null;
};

export async function ensureQuestProgress(db: Database, userId: string) {
  await db.execute(sql`
    insert into app.user_quest_progress (user_id, source, source_id, target_count)
    select ${userId}, 'level_quest', level_quest_sets.id, level_quest_sets.target_count
    from app.users
    join app.level_quest_sets on level_quest_sets.level = users.level
    where users.id = ${userId}
    on conflict (user_id, source, source_id) do nothing
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
      from app.user_quest_progress
      join app.level_quest_sets on level_quest_sets.id = user_quest_progress.source_id
      join app.quest_templates on quest_templates.id = level_quest_sets.template_id
      where
        user_quest_progress.user_id = ${userId}
        and user_quest_progress.claimed_at is null
        and quest_templates.trigger_type = ${triggerType}
    )
    update app.user_quest_progress
    set
      progress_count = least(
        user_quest_progress.target_count,
        user_quest_progress.progress_count + ${delta}
      ),
      completed_at = case
        when user_quest_progress.completed_at is not null then user_quest_progress.completed_at
        when user_quest_progress.progress_count + ${delta} >= user_quest_progress.target_count then now()
        else null
      end,
      claimable_at = case
        when user_quest_progress.claimable_at is not null then user_quest_progress.claimable_at
        when user_quest_progress.progress_count + ${delta} >= user_quest_progress.target_count then now()
        else null
      end,
      updated_at = now()
    from matching_progress
    where user_quest_progress.id = matching_progress.id
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
      from app.users
      where id = ${userId}
    ),
    level_caps as (
      select
        perk_definitions.key,
        max(level_perks.numeric_value) as cap
      from app.level_perks
      join app.perk_definitions on perk_definitions.id = level_perks.perk_id
      cross join user_level
      where
        level_perks.level >= 1
        and level_perks.level <= user_level.level
      group by perk_definitions.key
    )
    select
      coalesce(
        (select cap from level_caps where key = 'max_concurrent_billboards'),
        0
      )::int as "maxConcurrentBillboards",
      coalesce(
        (select cap from level_caps where key = 'daily_billboard_limit'),
        0
      )::int as "dailyBillboardLimit",
      coalesce((select cap from level_caps where key = 'sticker_slots'), 0)::int as "stickerSlots"
  `);

  const capacities = rows[0];

  // ponytail: floor every per-account cap at 1000. Progression perks still
  // raise it further; drop the Math.max to restore level-gated limits.
  return {
    dailyBillboardLimit: Math.max(capacities?.dailyBillboardLimit ?? 4, 1000),
    maxConcurrentBillboards: Math.max(capacities?.maxConcurrentBillboards ?? 3, 1000),
    stickerSlots: Math.max(capacities?.stickerSlots ?? 10, 1000),
  };
}

export function questProgressUpdate(row: ProgressUpdateRow) {
  return {
    claimable: row.claimable,
    completed: row.completed,
    progressCount: row.progressCount,
    questId: row.questId,
    source: row.source,
    targetCount: row.targetCount,
  };
}

export function questRowToProgress(row: Record<string, unknown>) {
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
    source: "level_quest" as const,
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
    quest: {
      ...quest,
      level: Number(row.level),
      sortOrder: Number(row.sortOrder),
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
