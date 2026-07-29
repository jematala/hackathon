import {
  getCurrentUserResponseSchema,
  getUserProgressResponseSchema,
  getUserResponseSchema,
  idSchema,
  updateAvatarInputSchema,
  updateCurrentUserInputSchema,
  updateCurrentUserResponseSchema,
} from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { sql } from "drizzle-orm";
import { Hono } from "hono";

import type { getDb } from "../db";
import { badRequest, conflict, notFound } from "../http";
import { getAuthUser, requireAuth } from "../middleware/auth";
import {
  ensureQuestProgress,
  getUserCapacities,
  questRowToProgress,
} from "../services/progression";
import { isoDateTime, nullableIsoDateTime } from "../serialize";
import type { AppBindings } from "../types";

type UserRow = {
  avatarBase64: string | null;
  bannedAt: Date | string | null;
  createdAt: Date | string;
  deletedAt: Date | string | null;
  displayName: string;
  id: string;
  level: number;
  updatedAt: Date | string;
  username: string;
  xp: number;
};

type PerkRow = {
  description: string;
  level: number;
  levelPerkId: string;
  metadata: Record<string, unknown> | null;
  name: string;
  numericValue: number | null;
  perkId: string;
  perkKey: string;
  sourceLevel?: number;
  unlockedAt?: Date | string;
};

export const usersRoute = new Hono<AppBindings>();

usersRoute.get("/users/me", requireAuth, async (c) => {
  const user = await loadUser(c.var.db, getAuthUser(c).id);

  return c.json(getCurrentUserResponseSchema.parse({ user: currentUser(user) }));
});

usersRoute.patch(
  "/users/me",
  requireAuth,
  zValidator("json", updateCurrentUserInputSchema),
  async (c) => {
    const input = c.req.valid("json");
    const authUser = getAuthUser(c);
    const db = c.var.db;
    let rows: UserRow[];
    try {
      rows = await db.execute<UserRow>(sql`
        update app.users
        set
          username = coalesce(${input.username ?? null}, username),
          display_name = coalesce(${input.displayName ?? null}, display_name),
          updated_at = now()
        where id = ${authUser.id}
        returning
          id,
          username,
          display_name as "displayName",
          avatar_base64 as "avatarBase64",
          level,
          xp,
          banned_at as "bannedAt",
          deleted_at as "deletedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `);
    } catch (error) {
      if (isUniqueViolation(error)) {
        conflict("Username is already taken.");
      }
      throw error;
    }

    return c.json(updateCurrentUserResponseSchema.parse({ user: currentUser(rows[0]!) }));
  },
);

usersRoute.patch(
  "/users/me/avatar",
  requireAuth,
  zValidator("json", updateAvatarInputSchema),
  async (c) => {
    const input = c.req.valid("json");
    const authUser = getAuthUser(c);
    const db = c.var.db;
    validateAvatarPng(input.avatarBase64);
    const rows = await db.execute<UserRow>(sql`
      update app.users
      set avatar_base64 = ${input.avatarBase64}, updated_at = now()
      where id = ${authUser.id}
      returning
        id,
        username,
        display_name as "displayName",
        avatar_base64 as "avatarBase64",
        level,
        xp,
        banned_at as "bannedAt",
        deleted_at as "deletedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `);

    return c.json(updateCurrentUserResponseSchema.parse({ user: currentUser(rows[0]!) }));
  },
);

usersRoute.get("/users/me/progress", requireAuth, async (c) => {
  const authUser = getAuthUser(c);
  const db = c.var.db;

  await ensureQuestProgress(db, authUser.id);

  const user = await loadUser(c.var.db, authUser.id);
  const capacities = await getUserCapacities(db, authUser.id);
  const [statsRows, unlocked, next] = await Promise.all([
    db.execute<{
      activeBillboards: number;
      billboardsCreatedToday: number;
      placementsCreated: number;
      poisVisited: number;
      repliesReceived: number;
      stickersSaved: number;
    }>(sql`
      select
        (select count(*)::int from app.poi_visits where user_id = ${authUser.id}) as "poisVisited",
        (
          select count(*)::int
          from app.billboards
          where
            author_id = ${authUser.id}
            and (timezone('Australia/Sydney', created_at))::date =
              (timezone('Australia/Sydney', now()))::date
        ) as "billboardsCreatedToday",
        (
          select count(*)::int
          from app.billboards
          where
            author_id = ${authUser.id}
            and deleted_at is null
            and hidden_at is null
            and status = 'active'
            and expires_at > now()
        ) as "activeBillboards",
        (
          select count(*)::int
          from app.saved_stickers
          where user_id = ${authUser.id} and deleted_at is null
        ) as "stickersSaved",
        (
          select count(*)::int
          from app.billboard_placements
          where author_id = ${authUser.id} and deleted_at is null
        ) as "placementsCreated",
        (
          select count(*)::int
          from app.billboard_placements
          join app.billboards on billboards.id = billboard_placements.billboard_id
          where
            billboards.author_id = ${authUser.id}
            and billboard_placements.author_id <> ${authUser.id}
            and billboard_placements.deleted_at is null
        ) as "repliesReceived"
    `),
    loadUnlockedPerks(db, authUser.id),
    loadNextPerks(db, user.level),
  ]);

  const stats = statsRows[0]!;
  const progress = {
    capacities,
    level: user.level,
    nextPerks: next.map(levelPerk),
    stats,
    unlockedPerks: unlocked.map(unlockedPerk),
    userId: authUser.id,
    xp: user.xp,
  };

  return c.json(getUserProgressResponseSchema.parse({ progress }));
});

usersRoute.get("/users/me/perks", requireAuth, async (c) => {
  const authUser = getAuthUser(c);
  const db = c.var.db;
  const user = await loadUser(c.var.db, authUser.id);
  const [unlocked, next] = await Promise.all([
    loadUnlockedPerks(db, authUser.id),
    loadNextPerks(db, user.level),
  ]);

  return c.json({
    next: next.map(levelPerk),
    unlocked: unlocked.map(unlockedPerk),
  });
});

usersRoute.get("/users/:id", async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));

  if (!id.success) {
    notFound();
  }

  const user = await loadUser(c.var.db, id.data);

  return c.json(getUserResponseSchema.parse({ user: publicUser(user) }));
});

export async function loadUser(db: ReturnType<typeof getDb>, id: string) {
  const rows = await db.execute<UserRow>(sql`
    select
      id,
      username,
      display_name as "displayName",
      avatar_base64 as "avatarBase64",
      level,
      xp,
      banned_at as "bannedAt",
      deleted_at as "deletedAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
    from app.users
    where id = ${id} and deleted_at is null
  `);

  const user = rows[0];
  if (!user) {
    notFound("User not found.");
  }

  return user;
}

export function isUniqueViolation(error: unknown, depth = 0): boolean {
  if (depth > 4 || typeof error !== "object" || error === null) {
    return false;
  }
  if ("code" in error && error.code === "23505") {
    return true;
  }
  return "cause" in error && isUniqueViolation(error.cause, depth + 1);
}

export function validateAvatarPng(value: string) {
  const payload = value.startsWith("data:image/png;base64,") ? value.slice(22) : value;
  let header: string;
  try {
    header = atob(payload.slice(0, 32));
  } catch {
    badRequest("Avatar must be a valid PNG.");
  }

  const bytes = Uint8Array.from(header, (character) => character.charCodeAt(0));
  const isPng =
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[12] === 0x49 &&
    bytes[13] === 0x48 &&
    bytes[14] === 0x44 &&
    bytes[15] === 0x52;
  if (!isPng) {
    badRequest("Avatar must be a valid PNG.");
  }

  const view = new DataView(bytes.buffer);
  if (view.getUint32(16) !== 64 || view.getUint32(20) !== 64) {
    badRequest("Avatar PNG must be 64x64 pixels.");
  }
}

function publicUser(user: UserRow) {
  return {
    avatarBase64: user.avatarBase64,
    createdAt: isoDateTime(user.createdAt),
    displayName: user.displayName,
    id: user.id,
    level: user.level,
    username: user.username,
  };
}

function currentUser(user: UserRow) {
  return {
    ...publicUser(user),
    bannedAt: nullableIsoDateTime(user.bannedAt),
    deletedAt: nullableIsoDateTime(user.deletedAt),
    updatedAt: isoDateTime(user.updatedAt),
    xp: user.xp,
  };
}

function perk(row: PerkRow) {
  return {
    description: row.description,
    id: row.perkId,
    key: row.perkKey,
    name: row.name,
  };
}

function levelPerk(row: PerkRow) {
  return {
    id: row.levelPerkId,
    level: row.level,
    metadata: row.metadata,
    numericValue: row.numericValue,
    perk: perk(row),
  };
}

function unlockedPerk(row: PerkRow) {
  return {
    ...levelPerk(row),
    levelPerkId: row.levelPerkId,
    sourceLevel: row.sourceLevel!,
    unlockedAt: isoDateTime(row.unlockedAt!),
  };
}

async function loadUnlockedPerks(db: ReturnType<typeof getDb>, userId: string) {
  return db.execute<PerkRow>(sql`
    select
      level_perks.id as "levelPerkId",
      level_perks.level,
      level_perks.numeric_value as "numericValue",
      level_perks.metadata,
      perk_definitions.id as "perkId",
      perk_definitions.key as "perkKey",
      perk_definitions.name,
      perk_definitions.description,
      user_perk_unlocks.source_level as "sourceLevel",
      user_perk_unlocks.unlocked_at as "unlockedAt"
    from app.user_perk_unlocks
    join app.level_perks on level_perks.id = user_perk_unlocks.level_perk_id
    join app.perk_definitions on perk_definitions.id = level_perks.perk_id
    where user_perk_unlocks.user_id = ${userId}
    order by level_perks.level, perk_definitions.key
  `);
}

async function loadNextPerks(db: ReturnType<typeof getDb>, level: number) {
  return db.execute<PerkRow>(sql`
    select
      level_perks.id as "levelPerkId",
      level_perks.level,
      level_perks.numeric_value as "numericValue",
      level_perks.metadata,
      perk_definitions.id as "perkId",
      perk_definitions.key as "perkKey",
      perk_definitions.name,
      perk_definitions.description
    from app.level_perks
    join app.perk_definitions on perk_definitions.id = level_perks.perk_id
    where level_perks.level = (
      select min(level) from app.level_perks where level > ${level}
    )
    order by level_perks.level, perk_definitions.key
  `);
}

export async function loadQuestRows(db: ReturnType<typeof getDb>, userId: string) {
  await ensureQuestProgress(db, userId);

  const rows = await db.execute<Record<string, unknown>>(sql`
    select
      user_quest_progress.id as "progressId",
      user_quest_progress.source,
      user_quest_progress.source_id as "sourceId",
      user_quest_progress.progress_count as "progressCount",
      user_quest_progress.target_count as "targetCount",
      user_quest_progress.completed_at as "completedAt",
      user_quest_progress.claimable_at as "claimableAt",
      user_quest_progress.claimed_at as "claimedAt",
      user_quest_progress.claimed_xp as "claimedXp",
      level_quest_sets.xp_reward as "xpReward",
      quest_templates.id as "templateId",
      quest_templates.key as "templateKey",
      quest_templates.trigger_type as "templateTriggerType",
      quest_templates.title_template as "templateTitleTemplate",
      quest_templates.description_template as "templateDescriptionTemplate",
      quest_templates.min_target as "templateMinTarget",
      quest_templates.max_target as "templateMaxTarget",
      quest_templates.xp_reward as "templateXpReward",
      quest_templates.active as "templateActive",
      replace(
        quest_templates.title_template,
        '{target}',
        user_quest_progress.target_count::text
      ) as title,
      replace(
        quest_templates.description_template,
        '{target}',
        user_quest_progress.target_count::text
      ) as description,
      level_quest_sets.level,
      level_quest_sets.sort_order as "sortOrder"
    from app.user_quest_progress
    join app.level_quest_sets on level_quest_sets.id = user_quest_progress.source_id
    join app.quest_templates on quest_templates.id = level_quest_sets.template_id
    where user_quest_progress.user_id = ${userId}
    order by level_quest_sets.sort_order
  `);

  return rows.map(questRowToProgress);
}
