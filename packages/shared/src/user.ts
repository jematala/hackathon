import { z } from "zod";

import { base64PngSchema, idSchema, isoDateSchema, isoDateTimeSchema } from "./common";
import { levelPerkSchema, unlockedPerkSchema } from "./perk";

export const userProfileSchema = z.object({
  id: idSchema,
  username: z.string().min(1),
  displayName: z.string().min(1),
  avatarBase64: base64PngSchema.nullable(),
  level: z.number().int().positive(),
  createdAt: isoDateTimeSchema,
});

export const currentUserSchema = userProfileSchema.extend({
  isAdmin: z.boolean(),
  xp: z.number().int().min(0),
  dailyStreak: z.number().int().min(0),
  streakUpdatedOn: isoDateSchema.nullable(),
  lastDailyClaimedOn: isoDateSchema.nullable(),
  bannedAt: isoDateTimeSchema.nullable(),
  deletedAt: isoDateTimeSchema.nullable(),
  updatedAt: isoDateTimeSchema,
});

export const userProgressSchema = z.object({
  userId: idSchema,
  level: z.number().int().positive(),
  xp: z.number().int().min(0),
  dailyStreak: z.number().int().min(0),
  capacities: z.object({
    maxConcurrentBillboards: z.number().int().positive(),
    dailyBillboardLimit: z.number().int().positive(),
    stickerSlots: z.number().int().positive(),
  }),
  stats: z.object({
    poisVisited: z.number().int().min(0),
    billboardsCreatedToday: z.number().int().min(0),
    activeBillboards: z.number().int().min(0),
    stickersSaved: z.number().int().min(0),
    placementsCreated: z.number().int().min(0),
    repliesReceived: z.number().int().min(0),
  }),
  unlockedPerks: z.array(unlockedPerkSchema),
  nextPerks: z.array(levelPerkSchema),
});

export const getUserResponseSchema = z.object({
  user: userProfileSchema,
});

export const getCurrentUserResponseSchema = z.object({
  user: currentUserSchema,
});

export const getUserProgressResponseSchema = z.object({
  progress: userProgressSchema,
});

export const updateCurrentUserInputSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  displayName: z.string().min(1).max(80).optional(),
});

export const updateAvatarInputSchema = z.object({
  avatarBase64: base64PngSchema.max(256 * 1024, "Avatar PNG payload is too large."),
});

export const updateCurrentUserResponseSchema = z.object({
  user: currentUserSchema,
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type CurrentUser = z.infer<typeof currentUserSchema>;
export type UserProgress = z.infer<typeof userProgressSchema>;
export type GetUserResponse = z.infer<typeof getUserResponseSchema>;
export type GetCurrentUserResponse = z.infer<typeof getCurrentUserResponseSchema>;
export type GetUserProgressResponse = z.infer<typeof getUserProgressResponseSchema>;
export type UpdateCurrentUserInput = z.infer<typeof updateCurrentUserInputSchema>;
export type UpdateAvatarInput = z.infer<typeof updateAvatarInputSchema>;
export type UpdateCurrentUserResponse = z.infer<typeof updateCurrentUserResponseSchema>;
