import { z } from "zod";

import { idSchema, isoDateTimeSchema } from "./common";
import { userProfileSchema } from "./user";

export const reportTargetTypeSchema = z.enum(["billboard", "placement", "user"]);
export const reportReasonSchema = z.enum([
  "spam",
  "harassment",
  "hate",
  "sexual",
  "violence",
  "self_harm",
  "other",
]);
export const reportStatusSchema = z.enum(["open", "reviewing", "resolved", "dismissed"]);
export const moderationActionTypeSchema = z.enum(["hide", "remove", "warn", "ban", "dismiss"]);

export const createReportInputSchema = z.object({
  targetType: reportTargetTypeSchema,
  targetId: idSchema,
  reason: reportReasonSchema,
  details: z.string().max(1000).optional(),
});

export const reportSchema = z.object({
  id: idSchema,
  reporter: userProfileSchema,
  targetType: reportTargetTypeSchema,
  targetId: idSchema,
  reason: reportReasonSchema,
  details: z.string().nullable(),
  status: reportStatusSchema,
  adminNotes: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const createReportResponseSchema = z.object({
  report: reportSchema,
});

export const listAdminReportsInputSchema = z.object({
  status: reportStatusSchema.optional(),
});

export const listAdminReportsResponseSchema = z.object({
  reports: z.array(reportSchema),
});

export const adminReportActionInputSchema = z.object({
  action: moderationActionTypeSchema,
  notes: z.string().max(1000).optional(),
});

export const moderationActionSchema = z.object({
  id: idSchema,
  reportId: idSchema.nullable(),
  adminId: idSchema,
  action: moderationActionTypeSchema,
  targetType: reportTargetTypeSchema,
  targetId: idSchema,
  notes: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});

export const adminReportActionResponseSchema = z.object({
  report: reportSchema,
  action: moderationActionSchema,
});

export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>;
export type ReportReason = z.infer<typeof reportReasonSchema>;
export type ReportStatus = z.infer<typeof reportStatusSchema>;
export type ModerationActionType = z.infer<typeof moderationActionTypeSchema>;
export type CreateReportInput = z.infer<typeof createReportInputSchema>;
export type Report = z.infer<typeof reportSchema>;
export type CreateReportResponse = z.infer<typeof createReportResponseSchema>;
export type ListAdminReportsInput = z.infer<typeof listAdminReportsInputSchema>;
export type ListAdminReportsResponse = z.infer<typeof listAdminReportsResponseSchema>;
export type AdminReportActionInput = z.infer<typeof adminReportActionInputSchema>;
export type ModerationAction = z.infer<typeof moderationActionSchema>;
export type AdminReportActionResponse = z.infer<typeof adminReportActionResponseSchema>;
