import { z } from "zod";

import { idSchema, isoDateTimeSchema } from "./common";

export const perkKeySchema = z.enum([
  "daily_billboard_limit",
  "sticker_slots",
  "note_signature",
  "note_border_flair",
  "palette_expansion",
]);

export const perkSchema = z.object({
  id: idSchema,
  key: perkKeySchema,
  name: z.string().min(1),
  description: z.string().min(1),
});

export const levelPerkSchema = z.object({
  id: idSchema,
  level: z.number().int().positive(),
  perk: perkSchema,
  numericValue: z.number().int().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

export const unlockedPerkSchema = z.object({
  levelPerkId: idSchema,
  perk: perkSchema,
  sourceLevel: z.number().int().positive(),
  unlockedAt: isoDateTimeSchema,
  numericValue: z.number().int().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

export const listUserPerksResponseSchema = z.object({
  unlocked: z.array(unlockedPerkSchema),
  next: z.array(levelPerkSchema),
});

export type PerkKey = z.infer<typeof perkKeySchema>;
export type Perk = z.infer<typeof perkSchema>;
export type LevelPerk = z.infer<typeof levelPerkSchema>;
export type UnlockedPerk = z.infer<typeof unlockedPerkSchema>;
export type ListUserPerksResponse = z.infer<typeof listUserPerksResponseSchema>;
