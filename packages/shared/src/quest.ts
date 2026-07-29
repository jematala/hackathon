import { z } from "zod";

import { idSchema, isoDateTimeSchema } from "./common";

export const questTriggerTypeSchema = z.enum([
  "visit_pois",
  "leave_billboards",
  "place_stickers",
  "receive_replies",
  "save_stickers",
]);
export const questSourceSchema = z.enum(["level_quest"]);

export const questTemplateSchema = z.object({
  id: idSchema,
  key: z.string().min(1),
  triggerType: questTriggerTypeSchema,
  titleTemplate: z.string().min(1),
  descriptionTemplate: z.string().min(1),
  minTarget: z.number().int().positive(),
  maxTarget: z.number().int().positive(),
  xpReward: z.number().int().min(0),
  active: z.boolean(),
});

const questBaseSchema = z.object({
  id: idSchema,
  sourceId: idSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  targetCount: z.number().int().positive(),
  xpReward: z.number().int().min(0),
});

export const levelQuestSchema = questBaseSchema.extend({
  source: z.literal("level_quest"),
  template: questTemplateSchema,
  level: z.number().int().positive(),
  sortOrder: z.number().int().min(0),
});

export const questSchema = levelQuestSchema;

const questProgressBaseSchema = z.object({
  id: idSchema,
  progressCount: z.number().int().min(0),
  targetCount: z.number().int().positive(),
  completedAt: isoDateTimeSchema.nullable(),
  claimableAt: isoDateTimeSchema.nullable(),
  claimedAt: isoDateTimeSchema.nullable(),
  claimedXp: z.number().int().min(0).nullable(),
});

export const levelQuestProgressSchema = questProgressBaseSchema.extend({
  quest: levelQuestSchema,
});

export const questProgressSchema = levelQuestProgressSchema;

export const listQuestsResponseSchema = z.object({
  level: z.number().int().positive(),
  levelQuests: z.array(levelQuestProgressSchema),
});

export const claimQuestParamsSchema = z.object({
  id: idSchema,
});

export const claimQuestInputSchema = z.object({}).strict();

export const claimQuestErrorCodeSchema = z.enum([
  "quest_not_found",
  "quest_not_claimable",
  "quest_already_claimed",
]);

export const claimQuestErrorResponseSchema = z.object({
  error: claimQuestErrorCodeSchema,
  message: z.string().min(1),
});

export const claimQuestResponseSchema = z.object({
  quest: questProgressSchema,
  xpAwarded: z.number().int().min(0),
  levelBefore: z.number().int().positive(),
  levelAfter: z.number().int().positive(),
  unlockedPerkIds: z.array(idSchema),
});

export type QuestTriggerType = z.infer<typeof questTriggerTypeSchema>;
export type QuestSource = z.infer<typeof questSourceSchema>;
export type QuestTemplate = z.infer<typeof questTemplateSchema>;
export type LevelQuest = z.infer<typeof levelQuestSchema>;
export type Quest = z.infer<typeof questSchema>;
export type LevelQuestProgress = z.infer<typeof levelQuestProgressSchema>;
export type QuestProgress = z.infer<typeof questProgressSchema>;
export type ListQuestsResponse = z.infer<typeof listQuestsResponseSchema>;
export type ClaimQuestParams = z.infer<typeof claimQuestParamsSchema>;
export type ClaimQuestInput = z.infer<typeof claimQuestInputSchema>;
export type ClaimQuestErrorCode = z.infer<typeof claimQuestErrorCodeSchema>;
export type ClaimQuestErrorResponse = z.infer<typeof claimQuestErrorResponseSchema>;
export type ClaimQuestResponse = z.infer<typeof claimQuestResponseSchema>;
