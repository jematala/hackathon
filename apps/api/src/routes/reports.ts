import {
  adminReportActionInputSchema,
  adminReportActionResponseSchema,
  createReportInputSchema,
  createReportResponseSchema,
  listAdminReportsResponseSchema,
} from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { sql } from "drizzle-orm";
import { Hono } from "hono";

import { getDb, newId, nowSql } from "../db";
import { notFound } from "../http";
import { getAuthUser, requireAuth } from "../middleware/auth";
import { isoDateTime } from "../serialize";
import type { AppBindings } from "../types";
import { requireAdmin } from "./users";

type ReportRow = {
  adminNotes: string | null;
  createdAt: Date | string;
  details: string | null;
  reporterAvatarBase64: string | null;
  reporterCreatedAt: Date | string;
  reporterDisplayName: string;
  reporterId: string;
  reporterLevel: number;
  reporterUsername: string;
  id: string;
  reason: "harassment" | "hate" | "other" | "self_harm" | "sexual" | "spam" | "violence";
  status: "dismissed" | "open" | "resolved" | "reviewing";
  targetId: string;
  targetType: "billboard" | "placement" | "user";
  updatedAt: Date | string;
};

type ActionRow = {
  action: "ban" | "dismiss" | "hide" | "remove" | "warn";
  adminId: string;
  createdAt: Date | string;
  id: string;
  notes: string | null;
  reportId: string | null;
  targetId: string;
  targetType: "billboard" | "placement" | "user";
};

export const reportsRoute = new Hono<AppBindings>();

reportsRoute.post(
  "/reports",
  requireAuth,
  zValidator("json", createReportInputSchema),
  async (c) => {
    const db = getDb(c.env);
    const authUser = getAuthUser(c);
    const input = c.req.valid("json");
    const rows = await db.execute<{ id: string }>(sql`
    insert into reports (id, reporter_id, target_type, target_id, reason, details)
    values (${newId()}, ${authUser.id}, ${input.targetType}, ${input.targetId}, ${input.reason}, ${input.details ?? null})
    on conflict (reporter_id, target_type, target_id) do update
      set reason = excluded.reason, details = excluded.details, updated_at = ${nowSql()}
    returning id
  `);
    const report = await loadReport(db, rows[0]!.id);

    return c.json(createReportResponseSchema.parse({ report: reportResponse(report) }));
  },
);

reportsRoute.get("/admin/reports", requireAuth, async (c) => {
  const authUser = getAuthUser(c);

  requireAdmin(authUser);

  const db = getDb(c.env);
  const status = c.req.query("status");
  const rows = await db.execute<ReportRow>(sql`
    ${reportSelectSql()}
    where ${status ? sql`reports.status = ${status}` : sql`true`}
    order by reports.created_at desc
    limit 100
  `);

  return c.json(
    listAdminReportsResponseSchema.parse({
      reports: rows.map(reportResponse),
    }),
  );
});

reportsRoute.post(
  "/admin/reports/:id/action",
  requireAuth,
  zValidator("json", adminReportActionInputSchema),
  async (c) => {
    const db = getDb(c.env);
    const authUser = getAuthUser(c);
    const input = c.req.valid("json");

    requireAdmin(authUser);

    const report = await loadReport(db, c.req.param("id"));

    await applyModerationAction(db, report, input.action);

    const actionRows = await db.execute<ActionRow>(sql`
      insert into moderation_actions (
        id,
        report_id,
        admin_id,
        action,
        target_type,
        target_id,
        notes
      )
      values (
        ${newId()},
        ${report.id},
        ${authUser.id},
        ${input.action},
        ${report.targetType},
        ${report.targetId},
        ${input.notes ?? null}
      )
      returning
        id,
        report_id as "reportId",
        admin_id as "adminId",
        action,
        target_type as "targetType",
        target_id as "targetId",
        notes,
        created_at as "createdAt"
    `);
    await db.execute(sql`
      update reports
      set
        status = case when ${input.action} = 'dismiss' then 'dismissed' else 'resolved' end,
        admin_notes = ${input.notes ?? null},
        updated_at = ${nowSql()}
      where id = ${report.id}
    `);

    const updatedReport = await loadReport(db, report.id);

    return c.json(
      adminReportActionResponseSchema.parse({
        action: moderationAction(actionRows[0]!),
        report: reportResponse(updatedReport),
      }),
    );
  },
);

async function loadReport(db: ReturnType<typeof getDb>, id: string) {
  const rows = await db.execute<ReportRow>(sql`
    ${reportSelectSql()}
    where reports.id = ${id}
  `);
  const report = rows[0];

  if (!report) {
    notFound("Report not found.");
  }

  return report;
}

function reportSelectSql() {
  return sql`
    select
      reports.id,
      reports.target_type as "targetType",
      reports.target_id as "targetId",
      reports.reason,
      reports.details,
      reports.status,
      reports.admin_notes as "adminNotes",
      reports.created_at as "createdAt",
      reports.updated_at as "updatedAt",
      users.id as "reporterId",
      users.username as "reporterUsername",
      users.display_name as "reporterDisplayName",
      users.avatar_base64 as "reporterAvatarBase64",
      users.level as "reporterLevel",
      users.created_at as "reporterCreatedAt"
    from reports
    join users on users.id = reports.reporter_id
  `;
}

async function applyModerationAction(
  db: ReturnType<typeof getDb>,
  report: ReportRow,
  action: ActionRow["action"],
) {
  if (report.targetType === "billboard" && (action === "hide" || action === "remove")) {
    await db.execute(sql`
      update billboards
      set
        hidden_at = case when ${action} = 'hide' then ${nowSql()} else hidden_at end,
        deleted_at = case when ${action} = 'remove' then ${nowSql()} else deleted_at end,
        status = case when ${action} = 'hide' then 'hidden' else 'removed' end,
        updated_at = ${nowSql()}
      where id = ${report.targetId}
    `);
  }

  if (report.targetType === "placement" && (action === "hide" || action === "remove")) {
    await db.execute(sql`
      update billboard_placements
      set
        hidden_at = case when ${action} = 'hide' then ${nowSql()} else hidden_at end,
        deleted_at = case when ${action} = 'remove' then ${nowSql()} else deleted_at end,
        status = case when ${action} = 'hide' then 'hidden' else 'removed' end,
        updated_at = ${nowSql()}
      where id = ${report.targetId}
    `);
  }

  if (report.targetType === "user" && action === "ban") {
    await db.execute(sql`
      update users
      set banned_at = coalesce(banned_at, ${nowSql()}), updated_at = ${nowSql()}
      where id = ${report.targetId}
    `);
  }
}

function reportResponse(row: ReportRow) {
  return {
    adminNotes: row.adminNotes,
    createdAt: isoDateTime(row.createdAt),
    details: row.details,
    id: row.id,
    reason: row.reason,
    reporter: {
      avatarBase64: row.reporterAvatarBase64,
      createdAt: isoDateTime(row.reporterCreatedAt),
      displayName: row.reporterDisplayName,
      id: row.reporterId,
      level: row.reporterLevel,
      username: row.reporterUsername,
    },
    status: row.status,
    targetId: row.targetId,
    targetType: row.targetType,
    updatedAt: isoDateTime(row.updatedAt),
  };
}

function moderationAction(row: ActionRow) {
  return {
    action: row.action,
    adminId: row.adminId,
    createdAt: isoDateTime(row.createdAt),
    id: row.id,
    notes: row.notes,
    reportId: row.reportId,
    targetId: row.targetId,
    targetType: row.targetType,
  };
}
