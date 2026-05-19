import { sql } from "drizzle-orm";

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
    insert into app.user_quest_progress (user_id, source, source_id, target_count)
    select ${userId}, 'level_quest', level_quest_sets.id, level_quest_sets.target_count
    from app.users
    join app.level_quest_sets on level_quest_sets.level = users.level
    where users.id = ${userId}
    on conflict do nothing
  `);

  await db.execute(sql`
    with campus_day as (
      select
        id as campus_id,
        (timezone(timezone, now()))::date as active_on
      from app.campuses
      order by created_at
      limit 1
    ),
    selected_daily as (
      select
        daily_quest_pool.id,
        daily_quest_pool.target_count,
        campus_day.active_on
      from campus_day
      cross join lateral (
        select id, target_count
        from app.daily_quest_pool
        where active
        order by md5(
          id::text || ':' || campus_day.campus_id::text || ':' || campus_day.active_on::text
        )
        limit 1
      ) daily_quest_pool
    )
    insert into app.user_quest_progress (user_id, source, source_id, active_on, target_count)
    select ${userId}, 'daily_quest', id, active_on, target_count
    from selected_daily
    on conflict do nothing
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
      left join app.level_quest_sets
        on user_quest_progress.source = 'level_quest'
        and user_quest_progress.source_id = level_quest_sets.id
      left join app.quest_templates
        on level_quest_sets.template_id = quest_templates.id
      left join app.daily_quest_pool
        on user_quest_progress.source = 'daily_quest'
        and user_quest_progress.source_id = daily_quest_pool.id
      left join app.daily_quest_templates
        on daily_quest_pool.template_id = daily_quest_templates.id
      where
        user_quest_progress.user_id = ${userId}
        and user_quest_progress.claimed_at is null
        and (
          user_quest_progress.source = 'level_quest'
          or user_quest_progress.active_on = (timezone('Australia/Sydney', now()))::date
        )
        and coalesce(quest_templates.trigger_type, daily_quest_templates.trigger_type) = ${triggerType}
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
    )
    select
      max(level_perks.numeric_value) filter (
        where perk_definitions.key = 'max_concurrent_billboards'
      ) as "maxConcurrentBillboards",
      max(level_perks.numeric_value) filter (
        where perk_definitions.key = 'daily_billboard_limit'
      ) as "dailyBillboardLimit",
      max(level_perks.numeric_value) filter (
        where perk_definitions.key = 'sticker_slots'
      ) as "stickerSlots"
    from app.level_perks
    join app.perk_definitions on perk_definitions.id = level_perks.perk_id
    cross join user_level
    where level_perks.level <= user_level.level
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
    claimable: row.claimable,
    completed: row.completed,
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
