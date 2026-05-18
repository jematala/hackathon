import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  location: z.string().min(1).max(100),
  startsAt: z.string().datetime(),
});

export const eventSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  location: z.string(),
  startsAt: z.string().datetime(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
});

export const listEventsResponseSchema = z.object({
  events: z.array(eventSummarySchema),
});

export const createEventResponseSchema = z.object({
  event: eventSummarySchema,
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type EventSummary = z.infer<typeof eventSummarySchema>;
export type ListEventsResponse = z.infer<typeof listEventsResponseSchema>;
export type CreateEventResponse = z.infer<typeof createEventResponseSchema>;
