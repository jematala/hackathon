import { z } from "zod";

import {
  base64PngSchema,
  campusBoundsSchema,
  idSchema,
  isoDateSchema,
  isoDateTimeSchema,
  latLngSchema,
  latitudeSchema,
  longitudeSchema,
  questProgressUpdateSchema,
} from "./common";

export const campusSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  timezone: z.string().min(1),
  center: latLngSchema,
  radiusMeters: z.number().int().positive(),
  bounds: campusBoundsSchema,
  mapProvider: z.literal("openstreetmap"),
});

export const poiSummarySchema = z.object({
  id: idSchema,
  campusId: idSchema,
  title: z.string().min(1),
  description: z.string().nullable(),
  pictureBase64: base64PngSchema.nullable(),
  lat: latitudeSchema,
  lng: longitudeSchema,
  radiusMeters: z.number().int().positive(),
  isActive: z.boolean(),
  activeOn: isoDateSchema.nullable(),
  visited: z.boolean(),
});

export const poiDetailSchema = poiSummarySchema.extend({
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  visitCount: z.number().int().min(0),
});

export const listPoisInputSchema = z.object({
  campusId: idSchema.optional(),
});

export const listPoisResponseSchema = z.object({
  campus: campusSchema,
  pois: z.array(poiSummarySchema),
});

export const getPoiResponseSchema = z.object({
  poi: poiDetailSchema,
});

export const createPoiInputSchema = z.object({
  campusId: idSchema,
  title: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  pictureBase64: base64PngSchema.optional(),
  lat: latitudeSchema,
  lng: longitudeSchema,
  radiusMeters: z.number().int().positive().default(30),
  isActive: z.boolean().default(true),
});

export const updatePoiInputSchema = createPoiInputSchema.partial().extend({
  id: idSchema,
});

export const upsertPoiResponseSchema = z.object({
  poi: poiDetailSchema,
});

export const visitPoiInputSchema = z.object({
  lat: latitudeSchema,
  lng: longitudeSchema,
});

export const visitPoiResponseSchema = z.object({
  poiId: idSchema,
  firstVisit: z.boolean(),
  withinRadius: z.boolean(),
  visitedAt: isoDateTimeSchema,
  questProgress: z.array(questProgressUpdateSchema),
});

export type Campus = z.infer<typeof campusSchema>;
export type PoiSummary = z.infer<typeof poiSummarySchema>;
export type PoiDetail = z.infer<typeof poiDetailSchema>;
export type ListPoisInput = z.infer<typeof listPoisInputSchema>;
export type ListPoisResponse = z.infer<typeof listPoisResponseSchema>;
export type GetPoiResponse = z.infer<typeof getPoiResponseSchema>;
export type CreatePoiInput = z.infer<typeof createPoiInputSchema>;
export type UpdatePoiInput = z.infer<typeof updatePoiInputSchema>;
export type UpsertPoiResponse = z.infer<typeof upsertPoiResponseSchema>;
export type VisitPoiInput = z.infer<typeof visitPoiInputSchema>;
export type VisitPoiResponse = z.infer<typeof visitPoiResponseSchema>;
