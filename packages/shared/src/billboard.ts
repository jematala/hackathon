import { z } from "zod";

import {
  contentStatusSchema,
  idSchema,
  isoDateTimeSchema,
  latitudeSchema,
  longitudeSchema,
  normalizedCoordinateSchema,
  questProgressUpdateSchema,
} from "./common";
import { stickerAssetSchema } from "./sticker";

export const placementKindSchema = z.enum(["sticker", "sticky_note"]);

export const billboardSummarySchema = z.object({
  id: idSchema,
  campusId: idSchema,
  authorId: idSchema,
  authorUsername: z.string().min(1),
  body: z.string().min(1),
  lat: latitudeSchema,
  lng: longitudeSchema,
  status: contentStatusSchema,
  placementCount: z.number().int().min(0),
  emptyExpiresAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema,
  createdAt: isoDateTimeSchema,
});

export const billboardPlacementSchema = z.object({
  id: idSchema,
  billboardId: idSchema,
  authorId: idSchema,
  authorUsername: z.string().min(1),
  kind: placementKindSchema,
  x: normalizedCoordinateSchema,
  y: normalizedCoordinateSchema,
  zIndex: z.number().int().min(0),
  stickerAsset: stickerAssetSchema.nullable(),
  body: z.string().max(280).nullable(),
  status: contentStatusSchema,
  createdAt: isoDateTimeSchema,
});

export const billboardDetailSchema = billboardSummarySchema.extend({
  placements: z.array(billboardPlacementSchema),
});

export const listBillboardsInputSchema = z.object({
  campusId: idSchema.optional(),
  north: latitudeSchema.optional(),
  south: latitudeSchema.optional(),
  east: longitudeSchema.optional(),
  west: longitudeSchema.optional(),
});

export const listBillboardsResponseSchema = z.object({
  billboards: z.array(billboardSummarySchema),
});

export const getBillboardResponseSchema = z.object({
  billboard: billboardDetailSchema,
});

export const createBillboardInputSchema = z.object({
  campusId: idSchema,
  body: z.string().min(1).max(500),
  lat: latitudeSchema,
  lng: longitudeSchema,
});

export const createBillboardResponseSchema = z.object({
  billboard: billboardSummarySchema,
  replacedBillboardId: idSchema.nullable(),
  questProgress: z.array(questProgressUpdateSchema),
});

export const createPlacementInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("sticker"),
    stickerAssetId: idSchema,
    x: normalizedCoordinateSchema,
    y: normalizedCoordinateSchema,
  }),
  z.object({
    kind: z.literal("sticky_note"),
    body: z.string().min(1).max(280),
    x: normalizedCoordinateSchema,
    y: normalizedCoordinateSchema,
  }),
]);

export const createPlacementResponseSchema = z.object({
  placement: billboardPlacementSchema,
  questProgress: z.array(questProgressUpdateSchema),
});

export const deleteBillboardResponseSchema = z.object({
  deleted: z.boolean(),
});

export type PlacementKind = z.infer<typeof placementKindSchema>;
export type BillboardSummary = z.infer<typeof billboardSummarySchema>;
export type BillboardPlacement = z.infer<typeof billboardPlacementSchema>;
export type BillboardDetail = z.infer<typeof billboardDetailSchema>;
export type ListBillboardsInput = z.infer<typeof listBillboardsInputSchema>;
export type ListBillboardsResponse = z.infer<typeof listBillboardsResponseSchema>;
export type GetBillboardResponse = z.infer<typeof getBillboardResponseSchema>;
export type CreateBillboardInput = z.infer<typeof createBillboardInputSchema>;
export type CreateBillboardResponse = z.infer<typeof createBillboardResponseSchema>;
export type CreatePlacementInput = z.infer<typeof createPlacementInputSchema>;
export type CreatePlacementResponse = z.infer<typeof createPlacementResponseSchema>;
export type DeleteBillboardResponse = z.infer<typeof deleteBillboardResponseSchema>;
