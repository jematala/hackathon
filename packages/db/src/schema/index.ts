import { sql } from "drizzle-orm";
import {
  boolean,
  check,
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
  uuid,
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
export const contentModerationTargetTypeEnum = appSchema.enum("content_moderation_target_type", [
  "billboard",
  "placement",
  "sticker_asset",
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
const currentSydneyDate = sql`(timezone('Australia/Sydney', now()))::date`;
const uuidPrimaryKey = (name = "id") =>
  uuid(name)
    .primaryKey()
    .default(sql`gen_random_uuid()`);

export const users = appSchema.table(
  "users",
  {
    id: uuidPrimaryKey(),
    clerkUserId: text("clerk_user_id").notNull().unique(),
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
  },
  (table) => [
    check("users_level_check", sql`${table.level} >= 1`),
    check("users_xp_check", sql`${table.xp} >= 0`),
    check("users_daily_streak_check", sql`${table.dailyStreak} >= 0`),
  ],
);

export const pushTokens = appSchema.table(
  "push_tokens",
  {
    id: uuidPrimaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    platform: pushPlatformEnum("platform").notNull().default("expo"),
    createdAt,
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [index("push_tokens_user_idx").on(table.userId)],
);

export const campuses = appSchema.table(
  "campuses",
  {
    id: uuidPrimaryKey(),
    name: text("name").notNull(),
    timezone: text("timezone").notNull(),
    centerLat: doublePrecision("center_lat").notNull(),
    centerLng: doublePrecision("center_lng").notNull(),
    radiusMeters: integer("radius_meters").notNull(),
    bounds: jsonb("bounds").$type<JsonObject>().notNull(),
    mapProvider: text("map_provider").notNull().default("openstreetmap"),
    createdAt,
  },
  (table) => [check("campuses_radius_meters_check", sql`${table.radiusMeters} > 0`)],
);

export const pois = appSchema.table(
  "pois",
  {
    id: uuidPrimaryKey(),
    campusId: uuid("campus_id")
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
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt,
    updatedAt,
    deletedAt,
  },
  (table) => [
    index("pois_location_point_idx").using("gist", table.locationPoint),
    index("pois_active_campus_idx")
      .on(table.campusId, table.isActive)
      .where(sql`${table.deletedAt} is null`),
    check("pois_radius_meters_check", sql`${table.radiusMeters} > 0`),
  ],
);

export const poiDailyActivations = appSchema.table(
  "poi_daily_activations",
  {
    campusId: uuid("campus_id")
      .notNull()
      .references(() => campuses.id, { onDelete: "cascade" }),
    poiId: uuid("poi_id")
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
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    poiId: uuid("poi_id")
      .notNull()
      .references(() => pois.id, { onDelete: "cascade" }),
    visitedAt: timestamp("visited_at", { withTimezone: true }).notNull().defaultNow(),
    visitedOn: date("visited_on").notNull().default(currentSydneyDate),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.poiId] }),
    index("poi_visits_poi_idx").on(table.poiId),
  ],
);

export const billboards = appSchema.table(
  "billboards",
  {
    id: uuidPrimaryKey(),
    campusId: uuid("campus_id")
      .notNull()
      .references(() => campuses.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    locationPoint: geographyPoint("location_point").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    status: contentStatusEnum("status").notNull().default("pending"),
    moderationSummary: jsonb("moderation_summary").$type<JsonObject>(),
    createdOn: date("created_on").notNull().default(currentSydneyDate),
    expiresAt: timestamp("expires_at", { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '5 days'`),
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
    check(
      "billboards_expires_at_check",
      sql`${table.expiresAt} > ${table.createdAt} and ${table.expiresAt} <= ${table.createdAt} + interval '5 days'`,
    ),
  ],
);

export const stickerAssets = appSchema.table(
  "sticker_assets",
  {
    id: uuidPrimaryKey(),
    ownerId: uuid("owner_id")
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
  (table) => [
    index("sticker_assets_owner_idx").on(table.ownerId),
    check("sticker_assets_width_check", sql`${table.width} > 0`),
    check("sticker_assets_height_check", sql`${table.height} > 0`),
  ],
);

export const billboardPlacements = appSchema.table(
  "billboard_placements",
  {
    id: uuidPrimaryKey(),
    billboardId: uuid("billboard_id")
      .notNull()
      .references(() => billboards.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: placementKindEnum("kind").notNull(),
    x: doublePrecision("x").notNull(),
    y: doublePrecision("y").notNull(),
    zIndex: integer("z_index").notNull().default(0),
    stickerAssetId: uuid("sticker_asset_id").references(() => stickerAssets.id, {
      onDelete: "restrict",
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
    check("billboard_placements_x_check", sql`${table.x} >= 0 and ${table.x} <= 1`),
    check("billboard_placements_y_check", sql`${table.y} >= 0 and ${table.y} <= 1`),
    check(
      "billboard_placements_kind_payload_check",
      sql`
        (
          ${table.kind} = 'sticker'
          and ${table.stickerAssetId} is not null
          and ${table.body} is null
        )
        or (
          ${table.kind} = 'sticky_note'
          and ${table.stickerAssetId} is null
          and ${table.body} is not null
        )
      `,
    ),
  ],
);

export const savedStickers = appSchema.table(
  "saved_stickers",
  {
    id: uuidPrimaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: savedStickerKindEnum("kind").notNull(),
    stickerAssetId: uuid("sticker_asset_id").references(() => stickerAssets.id, {
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
    check(
      "saved_stickers_kind_payload_check",
      sql`
        (
          ${table.kind} = 'sticker'
          and ${table.stickerAssetId} is not null
          and ${table.body} is null
        )
        or (
          ${table.kind} = 'sticky_note'
          and ${table.stickerAssetId} is null
          and ${table.body} is not null
        )
      `,
    ),
  ],
);

export const questTemplates = appSchema.table(
  "quest_templates",
  {
    id: uuidPrimaryKey(),
    key: text("key").notNull().unique(),
    triggerType: questTriggerTypeEnum("trigger_type").notNull(),
    titleTemplate: text("title_template").notNull(),
    descriptionTemplate: text("description_template").notNull(),
    minTarget: integer("min_target").notNull(),
    maxTarget: integer("max_target").notNull(),
    xpReward: integer("xp_reward").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt,
  },
  (table) => [
    check("quest_templates_min_target_check", sql`${table.minTarget} > 0`),
    check("quest_templates_max_target_check", sql`${table.maxTarget} >= ${table.minTarget}`),
    check("quest_templates_xp_reward_check", sql`${table.xpReward} >= 0`),
  ],
);

export const dailyQuestTemplates = appSchema.table(
  "daily_quest_templates",
  {
    id: uuidPrimaryKey(),
    key: text("key").notNull().unique(),
    triggerType: questTriggerTypeEnum("trigger_type").notNull(),
    titleTemplate: text("title_template").notNull(),
    descriptionTemplate: text("description_template").notNull(),
    minTarget: integer("min_target").notNull(),
    maxTarget: integer("max_target").notNull(),
    xpReward: integer("xp_reward").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt,
  },
  (table) => [
    check("daily_quest_templates_min_target_check", sql`${table.minTarget} > 0`),
    check("daily_quest_templates_max_target_check", sql`${table.maxTarget} >= ${table.minTarget}`),
    check("daily_quest_templates_xp_reward_check", sql`${table.xpReward} >= 0`),
  ],
);

export const levelQuestSets = appSchema.table(
  "level_quest_sets",
  {
    id: uuidPrimaryKey(),
    level: integer("level").notNull(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => questTemplates.id, { onDelete: "restrict" }),
    targetCount: integer("target_count").notNull(),
    xpReward: integer("xp_reward").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt,
  },
  (table) => [
    uniqueIndex("level_quest_sets_level_sort_idx").on(table.level, table.sortOrder),
    check("level_quest_sets_level_check", sql`${table.level} >= 1`),
    check("level_quest_sets_target_count_check", sql`${table.targetCount} > 0`),
    check("level_quest_sets_xp_reward_check", sql`${table.xpReward} >= 0`),
  ],
);

export const dailyQuestPool = appSchema.table(
  "daily_quest_pool",
  {
    id: uuidPrimaryKey(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => dailyQuestTemplates.id, { onDelete: "restrict" }),
    targetCount: integer("target_count").notNull(),
    xpReward: integer("xp_reward").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt,
  },
  (table) => [
    check("daily_quest_pool_target_count_check", sql`${table.targetCount} > 0`),
    check("daily_quest_pool_xp_reward_check", sql`${table.xpReward} >= 0`),
  ],
);

export const dailyQuestAssignments = appSchema.table(
  "daily_quest_assignments",
  {
    id: uuidPrimaryKey(),
    campusId: uuid("campus_id")
      .notNull()
      .references(() => campuses.id, { onDelete: "cascade" }),
    activeOn: date("active_on").notNull(),
    dailyQuestPoolId: uuid("daily_quest_pool_id")
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
    id: uuidPrimaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    source: questSourceEnum("source").notNull(),
    sourceId: uuid("source_id").notNull(),
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
    check("user_quest_progress_progress_count_check", sql`${table.progressCount} >= 0`),
    check("user_quest_progress_target_count_check", sql`${table.targetCount} > 0`),
    check(
      "user_quest_progress_claimed_xp_check",
      sql`${table.claimedXp} is null or ${table.claimedXp} >= 0`,
    ),
  ],
);

export const perkDefinitions = appSchema.table("perk_definitions", {
  id: uuidPrimaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt,
});

export const levelPerks = appSchema.table(
  "level_perks",
  {
    id: uuidPrimaryKey(),
    level: integer("level").notNull(),
    perkId: uuid("perk_id")
      .notNull()
      .references(() => perkDefinitions.id, { onDelete: "restrict" }),
    numericValue: integer("numeric_value"),
    metadata: jsonb("metadata").$type<JsonObject>(),
    createdAt,
  },
  (table) => [
    uniqueIndex("level_perks_level_perk_idx").on(table.level, table.perkId),
    check("level_perks_level_check", sql`${table.level} >= 1`),
  ],
);

export const userPerkUnlocks = appSchema.table(
  "user_perk_unlocks",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    levelPerkId: uuid("level_perk_id")
      .notNull()
      .references(() => levelPerks.id, { onDelete: "restrict" }),
    sourceLevel: integer("source_level").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.levelPerkId] }),
    check("user_perk_unlocks_source_level_check", sql`${table.sourceLevel} >= 1`),
  ],
);

export const streakRewardDefinitions = appSchema.table(
  "streak_reward_definitions",
  {
    id: uuidPrimaryKey(),
    streakDays: integer("streak_days").notNull().unique(),
    name: text("name").notNull(),
    reward: jsonb("reward").$type<JsonObject>().notNull(),
    active: boolean("active").notNull().default(true),
    createdAt,
  },
  (table) => [check("streak_reward_definitions_streak_days_check", sql`${table.streakDays} > 0`)],
);

export const reports = appSchema.table(
  "reports",
  {
    id: uuidPrimaryKey(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: reportTargetTypeEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
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
  id: uuidPrimaryKey(),
  reportId: uuid("report_id").references(() => reports.id, { onDelete: "set null" }),
  adminId: uuid("admin_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  action: moderationActionTypeEnum("action").notNull(),
  targetType: reportTargetTypeEnum("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  notes: text("notes"),
  createdAt,
});

export const contentModerationLogs = appSchema.table("content_moderation_logs", {
  id: uuidPrimaryKey(),
  targetType: contentModerationTargetTypeEnum("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  provider: text("provider").notNull().default("openai"),
  flagged: boolean("flagged").notNull(),
  categories: jsonb("categories").$type<JsonObject>(),
  scores: jsonb("scores").$type<JsonObject>(),
  rawResponse: jsonb("raw_response").$type<JsonObject>(),
  createdAt,
});
