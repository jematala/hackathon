import { z } from "zod";

import { base64PngSchema, contentStatusSchema, idSchema, isoDateTimeSchema } from "./common";

export const savedStickerKindSchema = z.enum(["sticker", "sticky_note"]);

export const stickerAssetSchema = z.object({
  id: idSchema,
  ownerId: idSchema,
  pngBase64: base64PngSchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  palette: z.record(z.string(), z.unknown()).nullable(),
  status: contentStatusSchema,
  createdAt: isoDateTimeSchema,
});

export const savedStickerSchema = z.object({
  id: idSchema,
  userId: idSchema,
  kind: savedStickerKindSchema,
  stickerAsset: stickerAssetSchema.nullable(),
  body: z.string().max(280).nullable(),
  label: z.string().max(80).nullable(),
  createdAt: isoDateTimeSchema,
});

export const createStickerInputSchema = z.object({
  pngBase64: base64PngSchema,
  width: z.number().int().positive().default(64),
  height: z.number().int().positive().default(64),
  palette: z.record(z.string(), z.unknown()).optional(),
});

export const createSavedStickerInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("sticker"),
    stickerAssetId: idSchema,
    label: z.string().max(80).optional(),
  }),
  z.object({
    kind: z.literal("sticky_note"),
    body: z.string().min(1).max(280),
    label: z.string().max(80).optional(),
  }),
]);

export const listSavedStickersResponseSchema = z.object({
  stickers: z.array(savedStickerSchema),
  capacity: z.number().int().positive(),
});

export const createStickerResponseSchema = z.object({
  sticker: stickerAssetSchema,
});

export const createSavedStickerResponseSchema = z.object({
  savedSticker: savedStickerSchema,
});

export const deleteSavedStickerResponseSchema = z.object({
  deleted: z.boolean(),
});

export type SavedStickerKind = z.infer<typeof savedStickerKindSchema>;
export type StickerAsset = z.infer<typeof stickerAssetSchema>;
export type SavedSticker = z.infer<typeof savedStickerSchema>;
export type CreateStickerInput = z.infer<typeof createStickerInputSchema>;
export type CreateSavedStickerInput = z.infer<typeof createSavedStickerInputSchema>;
export type ListSavedStickersResponse = z.infer<typeof listSavedStickersResponseSchema>;
export type CreateStickerResponse = z.infer<typeof createStickerResponseSchema>;
export type CreateSavedStickerResponse = z.infer<typeof createSavedStickerResponseSchema>;
export type DeleteSavedStickerResponse = z.infer<typeof deleteSavedStickerResponseSchema>;
