import { z } from "zod";

import { idSchema, isoDateSchema, isoDateTimeSchema } from "./common";

export const questKindSchema = z.enum(["level", "daily"]);
export const questTriggerTypeSchema = z.enum([
  "visit_pois",
  "leave_billboards",
  "place_stickers",
  "receive_replies",
  "save_stickers",
]);
export const questSourceSchema = z.enum(["level_quest", "daily_quest"]);

export const questTemplateSchema = z.object({
  id: idSchema,
  key: z.string().min(1),
  kind: questKindSchema,
  triggerType: questTriggerTypeSchema,
  titleTemplate: z.string().min(1),
  descriptionTemplate: z.string().min(1),
  minTarget: z.number().int().positive(),
  maxTarget: z.number().int().positive(),
  xpReward: z.number().int().min(0),
  active: z.boolean(),
});

export const questSchema = z.object({
  id: idSchema,
  source: questSourceSchema,
  sourceId: idSchema,
  template: questTemplateSchema,
  level: z.number().int().positive().nullable(),
  activeOn: isoDateSchema.nullable(),
  title: z.string().min(1),
  description: z.string().min(1),
  targetCount: z.number().int().positive(),
  xpReward: z.number().int().min(0),
  sortOrder: z.number().int().min(0),
});

export const questProgressSchema = z.object({
  quest: questSchema,
  progressCount: z.number().int().min(0),
  targetCount: z.number().int().positive(),
  completedAt: isoDateTimeSchema.nullable(),
  claimableAt: isoDateTimeSchema.nullable(),
  claimedAt: isoDateTimeSchema.nullable(),
  claimedXp: z.number().int().min(0).nullable(),
});

export const listQuestsResponseSchema = z.object({
  level: z.number().int().positive(),
  levelQuests: z.array(questProgressSchema),
  dailyQuest: questProgressSchema.nullable(),
  streak: z.number().int().min(0),
});

export const claimQuestInputSchema = z.object({
  source: questSourceSchema,
});

export const claimQuestResponseSchema = z.object({
  quest: questProgressSchema,
  xpAwarded: z.number().int().min(0),
  levelBefore: z.number().int().positive(),
  levelAfter: z.number().int().positive(),
  unlockedPerkIds: z.array(idSchema),
});

export type QuestKind = z.infer<typeof questKindSchema>;
export type QuestTriggerType = z.infer<typeof questTriggerTypeSchema>;
export type QuestSource = z.infer<typeof questSourceSchema>;
export type QuestTemplate = z.infer<typeof questTemplateSchema>;
export type Quest = z.infer<typeof questSchema>;
export type QuestProgress = z.infer<typeof questProgressSchema>;
export type ListQuestsResponse = z.infer<typeof listQuestsResponseSchema>;
export type ClaimQuestInput = z.infer<typeof claimQuestInputSchema>;
export type ClaimQuestResponse = z.infer<typeof claimQuestResponseSchema>;
