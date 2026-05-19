import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export type JsonObject = Record<string, unknown>;

export const appSchema = pgSchema("app");

export const contentStatusEnum = appSchema.enum("content_status", [
  "pending",
  "active",
  "hidden",
  "removed",
  "rejected",
]);
export const placementKindEnum = appSchema.enum("placement_kind", ["sticker", "sticky_note"]);
export const savedStickerKindEnum = appSchema.enum("saved_sticker_kind", [
  "sticker",
  "sticky_note",
]);
export const questKindEnum = appSchema.enum("quest_kind", ["level", "daily"]);
export const questTriggerTypeEnum = appSchema.enum("quest_trigger_type", [
  "visit_pois",
  "leave_billboards",
  "place_stickers",
  "receive_replies",
  "save_stickers",
]);
export const questSourceEnum = appSchema.enum("quest_source", ["level_quest", "daily_quest"]);
export const reportTargetTypeEnum = appSchema.enum("report_target_type", [
  "billboard",
  "placement",
  "user",
]);
export const reportReasonEnum = appSchema.enum("report_reason", [
  "spam",
  "harassment",
  "hate",
  "sexual",
  "violence",
  "self_harm",
  "other",
]);
export const reportStatusEnum = appSchema.enum("report_status", [
  "open",
  "reviewing",
  "resolved",
  "dismissed",
]);
export const moderationActionTypeEnum = appSchema.enum("moderation_action_type", [
  "hide",
  "remove",
  "warn",
  "ban",
  "dismiss",
]);
export const pushPlatformEnum = appSchema.enum("push_platform", ["expo", "ios", "android", "web"]);

const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geography(point, 4326)";
  },
});

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const deletedAt = timestamp("deleted_at", { withTimezone: true });
const currentDate = sql`current_date`;

export const users = appSchema.table("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  avatarBase64: text("avatar_base64"),
  isAdmin: boolean("is_admin").notNull().default(false),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  dailyStreak: integer("daily_streak").notNull().default(0),
  streakUpdatedOn: date("streak_updated_on"),
  lastDailyClaimedOn: date("last_daily_claimed_on"),
  bannedAt: timestamp("banned_at", { withTimezone: true }),
  deletedAt,
  createdAt,
  updatedAt,
});

export const pushTokens = appSchema.table(
  "push_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    platform: pushPlatformEnum("platform").notNull().default("expo"),
    createdAt,
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [index("push_tokens_user_idx").on(table.userId)],
);

export const campuses = appSchema.table("campuses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull(),
  centerLat: doublePrecision("center_lat").notNull(),
  centerLng: doublePrecision("center_lng").notNull(),
  radiusMeters: integer("radius_meters").notNull(),
  bounds: jsonb("bounds").$type<JsonObject>().notNull(),
  mapProvider: text("map_provider").notNull().default("openstreetmap"),
  createdAt,
});

export const pois = appSchema.table(
  "pois",
  {
    id: text("id").primaryKey(),
    campusId: text("campus_id")
      .notNull()
      .references(() => campuses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    pictureBase64: text("picture_base64"),
    locationPoint: geographyPoint("location_point").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    radiusMeters: integer("radius_meters").notNull().default(30),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt,
    updatedAt,
    deletedAt,
  },
  (table) => [
    index("pois_location_point_idx").using("gist", table.locationPoint),
    index("pois_active_campus_idx")
      .on(table.campusId, table.isActive)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const poiDailyActivations = appSchema.table(
  "poi_daily_activations",
  {
    campusId: text("campus_id")
      .notNull()
      .references(() => campuses.id, { onDelete: "cascade" }),
    poiId: text("poi_id")
      .notNull()
      .references(() => pois.id, { onDelete: "cascade" }),
    activeOn: date("active_on").notNull(),
    createdAt,
  },
  (table) => [primaryKey({ columns: [table.campusId, table.poiId, table.activeOn] })],
);

export const poiVisits = appSchema.table(
  "poi_visits",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    poiId: text("poi_id")
      .notNull()
      .references(() => pois.id, { onDelete: "cascade" }),
    visitedAt: timestamp("visited_at", { withTimezone: true }).notNull().defaultNow(),
    visitedOn: date("visited_on").notNull().default(currentDate),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.poiId] }),
    index("poi_visits_poi_idx").on(table.poiId),
  ],
);

export const billboards = appSchema.table(
  "billboards",
  {
    id: text("id").primaryKey(),
    campusId: text("campus_id")
      .notNull()
      .references(() => campuses.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    locationPoint: geographyPoint("location_point").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    status: contentStatusEnum("status").notNull().default("pending"),
    moderationSummary: jsonb("moderation_summary").$type<JsonObject>(),
    createdOn: date("created_on").notNull().default(currentDate),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    deletedAt,
    createdAt,
    updatedAt,
  },
  (table) => [
    index("billboards_location_point_idx").using("gist", table.locationPoint),
    index("billboards_active_idx")
      .on(table.campusId, table.status, table.expiresAt)
      .where(sql`${table.deletedAt} is null`),
    index("billboards_author_day_idx").on(table.authorId, table.createdOn),
  ],
);

export const stickerAssets = appSchema.table(
  "sticker_assets",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pngBase64: text("png_base64").notNull(),
    width: integer("width").notNull().default(64),
    height: integer("height").notNull().default(64),
    palette: jsonb("palette").$type<JsonObject>(),
    status: contentStatusEnum("status").notNull().default("pending"),
    moderationSummary: jsonb("moderation_summary").$type<JsonObject>(),
    createdAt,
    deletedAt,
  },
  (table) => [index("sticker_assets_owner_idx").on(table.ownerId)],
);

export const billboardPlacements = appSchema.table(
  "billboard_placements",
  {
    id: text("id").primaryKey(),
    billboardId: text("billboard_id")
      .notNull()
      .references(() => billboards.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: placementKindEnum("kind").notNull(),
    x: doublePrecision("x").notNull(),
    y: doublePrecision("y").notNull(),
    zIndex: integer("z_index").notNull().default(0),
    stickerAssetId: text("sticker_asset_id").references(() => stickerAssets.id, {
      onDelete: "set null",
    }),
    body: text("body"),
    status: contentStatusEnum("status").notNull().default("pending"),
    moderationSummary: jsonb("moderation_summary").$type<JsonObject>(),
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    deletedAt,
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("billboard_placements_one_per_user_idx").on(table.billboardId, table.authorId),
    index("billboard_placements_billboard_idx").on(table.billboardId, table.zIndex),
  ],
);

export const savedStickers = appSchema.table(
  "saved_stickers",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: savedStickerKindEnum("kind").notNull(),
    stickerAssetId: text("sticker_asset_id").references(() => stickerAssets.id, {
      onDelete: "cascade",
    }),
    body: text("body"),
    label: text("label"),
    createdAt,
    deletedAt,
  },
  (table) => [
    index("saved_stickers_user_idx")
      .on(table.userId)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const questTemplates = appSchema.table("quest_templates", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  kind: questKindEnum("kind").notNull(),
  triggerType: questTriggerTypeEnum("trigger_type").notNull(),
  titleTemplate: text("title_template").notNull(),
  descriptionTemplate: text("description_template").notNull(),
  minTarget: integer("min_target").notNull(),
  maxTarget: integer("max_target").notNull(),
  xpReward: integer("xp_reward").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt,
});

export const levelQuestSets = appSchema.table(
  "level_quest_sets",
  {
    id: text("id").primaryKey(),
    level: integer("level").notNull(),
    templateId: text("template_id")
      .notNull()
      .references(() => questTemplates.id, { onDelete: "restrict" }),
    targetCount: integer("target_count").notNull(),
    xpReward: integer("xp_reward").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt,
  },
  (table) => [uniqueIndex("level_quest_sets_level_sort_idx").on(table.level, table.sortOrder)],
);

export const dailyQuestPool = appSchema.table("daily_quest_pool", {
  id: text("id").primaryKey(),
  templateId: text("template_id")
    .notNull()
    .references(() => questTemplates.id, { onDelete: "restrict" }),
  targetCount: integer("target_count").notNull(),
  xpReward: integer("xp_reward").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt,
});

export const dailyQuestAssignments = appSchema.table(
  "daily_quest_assignments",
  {
    id: text("id").primaryKey(),
    campusId: text("campus_id")
      .notNull()
      .references(() => campuses.id, { onDelete: "cascade" }),
    activeOn: date("active_on").notNull(),
    dailyQuestPoolId: text("daily_quest_pool_id")
      .notNull()
      .references(() => dailyQuestPool.id, { onDelete: "restrict" }),
    createdAt,
  },
  (table) => [
    uniqueIndex("daily_quest_assignments_campus_day_idx").on(table.campusId, table.activeOn),
  ],
);

export const userQuestProgress = appSchema.table(
  "user_quest_progress",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    source: questSourceEnum("source").notNull(),
    sourceId: text("source_id").notNull(),
    progressCount: integer("progress_count").notNull().default(0),
    targetCount: integer("target_count").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    claimableAt: timestamp("claimable_at", { withTimezone: true }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    claimedXp: integer("claimed_xp"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("user_quest_progress_unique_idx").on(table.userId, table.source, table.sourceId),
    index("user_quest_progress_user_idx").on(table.userId),
  ],
);

export const perkDefinitions = appSchema.table("perk_definitions", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt,
});

export const levelPerks = appSchema.table(
  "level_perks",
  {
    id: text("id").primaryKey(),
    level: integer("level").notNull(),
    perkId: text("perk_id")
      .notNull()
      .references(() => perkDefinitions.id, { onDelete: "restrict" }),
    numericValue: integer("numeric_value"),
    metadata: jsonb("metadata").$type<JsonObject>(),
    createdAt,
  },
  (table) => [uniqueIndex("level_perks_level_perk_idx").on(table.level, table.perkId)],
);

export const userPerkUnlocks = appSchema.table(
  "user_perk_unlocks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    perkId: text("perk_id")
      .notNull()
      .references(() => perkDefinitions.id, { onDelete: "restrict" }),
    sourceLevel: integer("source_level").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.perkId] })],
);

export const streakRewardDefinitions = appSchema.table("streak_reward_definitions", {
  id: text("id").primaryKey(),
  streakDays: integer("streak_days").notNull().unique(),
  name: text("name").notNull(),
  reward: jsonb("reward").$type<JsonObject>().notNull(),
  active: boolean("active").notNull().default(true),
  createdAt,
});

export const reports = appSchema.table(
  "reports",
  {
    id: text("id").primaryKey(),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: reportTargetTypeEnum("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: reportReasonEnum("reason").notNull(),
    details: text("details"),
    status: reportStatusEnum("status").notNull().default("open"),
    adminNotes: text("admin_notes"),
    createdAt,
    updatedAt,
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

export const moderationActions = appSchema.table("moderation_actions", {
  id: text("id").primaryKey(),
  reportId: text("report_id").references(() => reports.id, { onDelete: "set null" }),
  adminId: text("admin_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  action: moderationActionTypeEnum("action").notNull(),
  targetType: reportTargetTypeEnum("target_type").notNull(),
  targetId: text("target_id").notNull(),
  notes: text("notes"),
  createdAt,
});

export const contentModerationLogs = appSchema.table("content_moderation_logs", {
  id: text("id").primaryKey(),
  targetType: reportTargetTypeEnum("target_type").notNull(),
  targetId: text("target_id").notNull(),
  provider: text("provider").notNull().default("openai"),
  flagged: boolean("flagged").notNull(),
  categories: jsonb("categories").$type<JsonObject>(),
  scores: jsonb("scores").$type<JsonObject>(),
  rawResponse: jsonb("raw_response").$type<JsonObject>(),
  createdAt,
});
