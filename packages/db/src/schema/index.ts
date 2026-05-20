import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export type JsonObject = Record<string, unknown>;

const timestamp = (name: string) =>
  text(name)
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`);
const nullableTimestamp = (name: string) => text(name);
const dateText = (name: string) => text(name);
const id = (name = "id") => text(name).primaryKey();
const requiredId = (name: string) => text(name).notNull();
const bool = (name: string) => integer(name, { mode: "boolean" });
const json = (name: string) => text(name, { mode: "json" }).$type<JsonObject>();

export const users = sqliteTable(
  "users",
  {
    id: id(),
    clerkUserId: text("clerk_user_id").notNull().unique(),
    username: text("username").notNull().unique(),
    displayName: text("display_name").notNull(),
    avatarBase64: text("avatar_base64"),
    isAdmin: bool("is_admin").notNull().default(false),
    level: integer("level").notNull().default(1),
    xp: integer("xp").notNull().default(0),
    dailyStreak: integer("daily_streak").notNull().default(0),
    streakUpdatedOn: dateText("streak_updated_on"),
    lastDailyClaimedOn: dateText("last_daily_claimed_on"),
    bannedAt: nullableTimestamp("banned_at"),
    deletedAt: nullableTimestamp("deleted_at"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    check("users_level_check", sql`${table.level} >= 1`),
    check("users_xp_check", sql`${table.xp} >= 0`),
    check("users_daily_streak_check", sql`${table.dailyStreak} >= 0`),
  ],
);

export const pushTokens = sqliteTable(
  "push_tokens",
  {
    id: id(),
    userId: requiredId("user_id").references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    platform: text("platform", { enum: ["expo", "ios", "android", "web"] })
      .notNull()
      .default("expo"),
    createdAt: timestamp("created_at"),
    revokedAt: nullableTimestamp("revoked_at"),
  },
  (table) => [index("push_tokens_user_idx").on(table.userId)],
);

export const campuses = sqliteTable(
  "campuses",
  {
    id: id(),
    name: text("name").notNull(),
    timezone: text("timezone").notNull(),
    centerLat: real("center_lat").notNull(),
    centerLng: real("center_lng").notNull(),
    radiusMeters: integer("radius_meters").notNull(),
    bounds: json("bounds").notNull(),
    mapProvider: text("map_provider").notNull().default("openstreetmap"),
    createdAt: timestamp("created_at"),
  },
  (table) => [check("campuses_radius_meters_check", sql`${table.radiusMeters} > 0`)],
);

export const pois = sqliteTable(
  "pois",
  {
    id: id(),
    campusId: requiredId("campus_id").references(() => campuses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    pictureBase64: text("picture_base64"),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    radiusMeters: integer("radius_meters").notNull().default(30),
    isActive: bool("is_active").notNull().default(true),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
    deletedAt: nullableTimestamp("deleted_at"),
  },
  (table) => [
    index("pois_active_campus_idx").on(table.campusId, table.isActive),
    check("pois_radius_meters_check", sql`${table.radiusMeters} > 0`),
  ],
);

export const poiVisits = sqliteTable(
  "poi_visits",
  {
    userId: requiredId("user_id").references(() => users.id, { onDelete: "cascade" }),
    poiId: requiredId("poi_id").references(() => pois.id, { onDelete: "cascade" }),
    visitedAt: timestamp("visited_at"),
    visitedOn: text("visited_on")
      .notNull()
      .default(sql`(date('now', '+10 hours'))`),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.poiId] }),
    index("poi_visits_poi_idx").on(table.poiId),
  ],
);

export const poiDailyActivations = sqliteTable(
  "poi_daily_activations",
  {
    campusId: requiredId("campus_id").references(() => campuses.id, { onDelete: "cascade" }),
    poiId: requiredId("poi_id").references(() => pois.id, { onDelete: "cascade" }),
    activeOn: text("active_on").notNull(),
    createdAt: timestamp("created_at"),
  },
  (table) => [primaryKey({ columns: [table.campusId, table.poiId, table.activeOn] })],
);

export const billboards = sqliteTable(
  "billboards",
  {
    id: id(),
    campusId: requiredId("campus_id").references(() => campuses.id, { onDelete: "cascade" }),
    authorId: requiredId("author_id").references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    status: text("status", { enum: ["pending", "active", "hidden", "removed", "rejected"] })
      .notNull()
      .default("pending"),
    moderationSummary: json("moderation_summary"),
    emptyExpiresAt: text("empty_expires_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+24 hours'))`),
    expiresAt: text("expires_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+5 days'))`),
    hiddenAt: nullableTimestamp("hidden_at"),
    deletedAt: nullableTimestamp("deleted_at"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    index("billboards_active_idx").on(table.campusId, table.status, table.expiresAt),
    index("billboards_author_day_idx").on(table.authorId, table.createdAt),
  ],
);

export const stickerAssets = sqliteTable(
  "sticker_assets",
  {
    id: id(),
    ownerId: requiredId("owner_id").references(() => users.id, { onDelete: "cascade" }),
    pngBase64: text("png_base64").notNull(),
    width: integer("width").notNull().default(64),
    height: integer("height").notNull().default(64),
    palette: json("palette"),
    status: text("status", { enum: ["pending", "active", "hidden", "removed", "rejected"] })
      .notNull()
      .default("pending"),
    moderationSummary: json("moderation_summary"),
    createdAt: timestamp("created_at"),
    deletedAt: nullableTimestamp("deleted_at"),
  },
  (table) => [
    index("sticker_assets_owner_idx").on(table.ownerId),
    check("sticker_assets_width_check", sql`${table.width} > 0`),
    check("sticker_assets_height_check", sql`${table.height} > 0`),
  ],
);

export const billboardPlacements = sqliteTable(
  "billboard_placements",
  {
    id: id(),
    billboardId: requiredId("billboard_id").references(() => billboards.id, {
      onDelete: "cascade",
    }),
    authorId: requiredId("author_id").references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["sticker", "sticky_note"] }).notNull(),
    x: real("x").notNull(),
    y: real("y").notNull(),
    zIndex: integer("z_index").notNull().default(0),
    stickerAssetId: text("sticker_asset_id").references(() => stickerAssets.id, {
      onDelete: "restrict",
    }),
    body: text("body"),
    status: text("status", { enum: ["pending", "active", "hidden", "removed", "rejected"] })
      .notNull()
      .default("pending"),
    moderationSummary: json("moderation_summary"),
    hiddenAt: nullableTimestamp("hidden_at"),
    deletedAt: nullableTimestamp("deleted_at"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("billboard_placements_one_per_user_idx")
      .on(table.billboardId, table.authorId)
      .where(sql`${table.deletedAt} is null`),
    index("billboard_placements_billboard_idx").on(table.billboardId, table.zIndex),
    check("billboard_placements_x_check", sql`${table.x} >= 0 and ${table.x} <= 1`),
    check("billboard_placements_y_check", sql`${table.y} >= 0 and ${table.y} <= 1`),
  ],
);

export const savedStickers = sqliteTable(
  "saved_stickers",
  {
    id: id(),
    userId: requiredId("user_id").references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["sticker", "sticky_note"] }).notNull(),
    stickerAssetId: text("sticker_asset_id").references(() => stickerAssets.id, {
      onDelete: "cascade",
    }),
    body: text("body"),
    label: text("label"),
    createdAt: timestamp("created_at"),
    deletedAt: nullableTimestamp("deleted_at"),
  },
  (table) => [index("saved_stickers_user_idx").on(table.userId)],
);

export const questTemplates = sqliteTable("quest_templates", {
  id: id(),
  key: text("key").notNull().unique(),
  triggerType: text("trigger_type", {
    enum: ["visit_pois", "leave_billboards", "place_stickers", "receive_replies", "save_stickers"],
  }).notNull(),
  titleTemplate: text("title_template").notNull(),
  descriptionTemplate: text("description_template").notNull(),
  minTarget: integer("min_target").notNull(),
  maxTarget: integer("max_target").notNull(),
  xpReward: integer("xp_reward").notNull(),
  active: bool("active").notNull().default(true),
  createdAt: timestamp("created_at"),
});

export const dailyQuestTemplates = sqliteTable("daily_quest_templates", {
  id: id(),
  key: text("key").notNull().unique(),
  triggerType: text("trigger_type", {
    enum: ["visit_pois", "leave_billboards", "place_stickers", "receive_replies", "save_stickers"],
  }).notNull(),
  titleTemplate: text("title_template").notNull(),
  descriptionTemplate: text("description_template").notNull(),
  minTarget: integer("min_target").notNull(),
  maxTarget: integer("max_target").notNull(),
  xpReward: integer("xp_reward").notNull(),
  active: bool("active").notNull().default(true),
  createdAt: timestamp("created_at"),
});

export const levelQuestSets = sqliteTable(
  "level_quest_sets",
  {
    id: id(),
    level: integer("level").notNull(),
    templateId: requiredId("template_id").references(() => questTemplates.id, {
      onDelete: "restrict",
    }),
    targetCount: integer("target_count").notNull(),
    xpReward: integer("xp_reward").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at"),
  },
  (table) => [uniqueIndex("level_quest_sets_level_sort_idx").on(table.level, table.sortOrder)],
);

export const dailyQuestPool = sqliteTable("daily_quest_pool", {
  id: id(),
  templateId: requiredId("template_id").references(() => dailyQuestTemplates.id, {
    onDelete: "restrict",
  }),
  targetCount: integer("target_count").notNull(),
  xpReward: integer("xp_reward").notNull(),
  active: bool("active").notNull().default(true),
  createdAt: timestamp("created_at"),
});

export const dailyQuestAssignments = sqliteTable(
  "daily_quest_assignments",
  {
    id: id(),
    campusId: requiredId("campus_id").references(() => campuses.id, { onDelete: "cascade" }),
    activeOn: text("active_on").notNull(),
    dailyQuestPoolId: requiredId("daily_quest_pool_id").references(() => dailyQuestPool.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    uniqueIndex("daily_quest_assignments_campus_day_idx").on(table.campusId, table.activeOn),
  ],
);

export const userQuestProgress = sqliteTable(
  "user_quest_progress",
  {
    id: id(),
    userId: requiredId("user_id").references(() => users.id, { onDelete: "cascade" }),
    source: text("source", { enum: ["level_quest", "daily_quest"] }).notNull(),
    sourceId: requiredId("source_id"),
    activeOn: text("active_on"),
    progressCount: integer("progress_count").notNull().default(0),
    targetCount: integer("target_count").notNull(),
    completedAt: nullableTimestamp("completed_at"),
    claimableAt: nullableTimestamp("claimable_at"),
    claimedAt: nullableTimestamp("claimed_at"),
    claimedXp: integer("claimed_xp"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("user_quest_progress_level_unique_idx")
      .on(table.userId, table.source, table.sourceId)
      .where(sql`${table.activeOn} is null`),
    uniqueIndex("user_quest_progress_daily_unique_idx")
      .on(table.userId, table.source, table.sourceId, table.activeOn)
      .where(sql`${table.activeOn} is not null`),
    index("user_quest_progress_user_idx").on(table.userId),
  ],
);

export const perkDefinitions = sqliteTable("perk_definitions", {
  id: id(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at"),
});

export const levelPerks = sqliteTable(
  "level_perks",
  {
    id: id(),
    level: integer("level").notNull(),
    perkId: requiredId("perk_id").references(() => perkDefinitions.id, { onDelete: "restrict" }),
    numericValue: integer("numeric_value"),
    metadata: json("metadata"),
    createdAt: timestamp("created_at"),
  },
  (table) => [uniqueIndex("level_perks_level_perk_idx").on(table.level, table.perkId)],
);

export const userPerkUnlocks = sqliteTable(
  "user_perk_unlocks",
  {
    userId: requiredId("user_id").references(() => users.id, { onDelete: "cascade" }),
    levelPerkId: requiredId("level_perk_id").references(() => levelPerks.id, {
      onDelete: "restrict",
    }),
    sourceLevel: integer("source_level").notNull(),
    unlockedAt: timestamp("unlocked_at"),
  },
  (table) => [primaryKey({ columns: [table.userId, table.levelPerkId] })],
);

export const streakRewardDefinitions = sqliteTable("streak_reward_definitions", {
  id: id(),
  streakDays: integer("streak_days").notNull().unique(),
  name: text("name").notNull(),
  reward: json("reward").notNull(),
  active: bool("active").notNull().default(true),
  createdAt: timestamp("created_at"),
});

export const signatures = sqliteTable("signatures", {
  id: id(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  assetBase64: text("asset_base64").notNull(),
  streakDayRequired: integer("streak_day_required").notNull(),
  active: bool("active").notNull().default(true),
  createdAt: timestamp("created_at"),
});

export const userSignatures = sqliteTable(
  "user_signatures",
  {
    userId: requiredId("user_id").references(() => users.id, { onDelete: "cascade" }),
    signatureId: requiredId("signature_id").references(() => signatures.id, {
      onDelete: "cascade",
    }),
    unlockedAt: timestamp("unlocked_at"),
    isEquipped: bool("is_equipped").notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.signatureId] }),
    uniqueIndex("user_signatures_one_equipped_idx")
      .on(table.userId)
      .where(sql`${table.isEquipped}`),
  ],
);

export const reports = sqliteTable(
  "reports",
  {
    id: id(),
    reporterId: requiredId("reporter_id").references(() => users.id, { onDelete: "cascade" }),
    targetType: text("target_type", { enum: ["billboard", "placement", "user"] }).notNull(),
    targetId: requiredId("target_id"),
    reason: text("reason", {
      enum: ["spam", "harassment", "hate", "sexual", "violence", "self_harm", "other"],
    }).notNull(),
    status: text("status", { enum: ["open", "reviewing", "resolved", "dismissed"] })
      .notNull()
      .default("open"),
    details: text("details"),
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("reports_reporter_target_idx").on(
      table.reporterId,
      table.targetType,
      table.targetId,
    ),
    index("reports_status_idx").on(table.status, table.createdAt),
  ],
);

export const moderationActions = sqliteTable("moderation_actions", {
  id: id(),
  reportId: text("report_id").references(() => reports.id, { onDelete: "set null" }),
  adminId: requiredId("admin_id").references(() => users.id, { onDelete: "restrict" }),
  action: text("action", { enum: ["hide", "remove", "warn", "ban", "dismiss"] }).notNull(),
  targetType: text("target_type", { enum: ["billboard", "placement", "user"] }).notNull(),
  targetId: requiredId("target_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at"),
});

export const contentModerationLogs = sqliteTable("content_moderation_logs", {
  id: id(),
  targetType: text("target_type", { enum: ["billboard", "placement", "sticker_asset"] }).notNull(),
  targetId: requiredId("target_id"),
  provider: text("provider").notNull().default("openai"),
  flagged: bool("flagged").notNull(),
  categories: json("categories"),
  scores: json("scores"),
  rawResponse: json("raw_response"),
  createdAt: timestamp("created_at"),
});
