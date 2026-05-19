import { z } from "zod";

import { idSchema, isoDateTimeSchema } from "./common";

export const signatureSchema = z.object({
  id: idSchema,
  key: z.string().min(1),
  name: z.string().min(1),
  assetBase64: z.string().min(1),
  streakDayRequired: z.number().int().positive(),
  active: z.boolean(),
});

export const userSignatureSchema = z.object({
  signature: signatureSchema,
  unlockedAt: isoDateTimeSchema,
  isEquipped: z.boolean(),
});

export const listSignaturesResponseSchema = z.object({
  catalog: z.array(signatureSchema),
});

export const listMySignaturesResponseSchema = z.object({
  unlocked: z.array(userSignatureSchema),
  signatureFeatureUnlocked: z.boolean(),
});

export const equipSignatureInputSchema = z.object({
  signatureId: idSchema.nullable(),
});

export const equipSignatureResponseSchema = z.object({
  equippedSignatureId: idSchema.nullable(),
});

export type Signature = z.infer<typeof signatureSchema>;
export type UserSignature = z.infer<typeof userSignatureSchema>;
export type ListSignaturesResponse = z.infer<typeof listSignaturesResponseSchema>;
export type ListMySignaturesResponse = z.infer<typeof listMySignaturesResponseSchema>;
export type EquipSignatureInput = z.infer<typeof equipSignatureInputSchema>;
export type EquipSignatureResponse = z.infer<typeof equipSignatureResponseSchema>;
