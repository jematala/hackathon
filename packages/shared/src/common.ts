import { z } from "zod";

export const idSchema = z.string().uuid();
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const isoDateTimeSchema = z.string().datetime();
export const latitudeSchema = z.number().min(-90).max(90);
export const longitudeSchema = z.number().min(-180).max(180);
export const normalizedCoordinateSchema = z.number().min(0).max(1);
export const contentStatusSchema = z.enum(["pending", "active", "hidden", "removed", "rejected"]);

export const latLngSchema = z.object({
  lat: latitudeSchema,
  lng: longitudeSchema,
});

export const campusBoundsSchema = z.object({
  north: latitudeSchema,
  south: latitudeSchema,
  east: longitudeSchema,
  west: longitudeSchema,
});

export const base64PngSchema = z
  .string()
  .min(1)
  .refine(
    (value) => value.startsWith("data:image/png;base64,") || /^[A-Za-z0-9+/]+={0,2}$/.test(value),
    "Expected a PNG data URL or base64 payload.",
  );

export const questProgressUpdateSchema = z.object({
  questId: idSchema,
  source: z.enum(["level_quest"]),
  progressCount: z.number().int().min(0),
  targetCount: z.number().int().positive(),
  completed: z.boolean(),
  claimable: z.boolean(),
});

export type LatLng = z.infer<typeof latLngSchema>;
export type CampusBounds = z.infer<typeof campusBoundsSchema>;
export type ContentStatus = z.infer<typeof contentStatusSchema>;
export type QuestProgressUpdate = z.infer<typeof questProgressUpdateSchema>;
