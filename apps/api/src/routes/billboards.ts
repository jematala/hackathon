import {
  createBillboardInputSchema,
  createBillboardResponseSchema,
  createPlacementInputSchema,
  createPlacementResponseSchema,
  deleteBillboardResponseSchema,
  getBillboardResponseSchema,
  idSchema,
  listBillboardsResponseSchema,
} from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { sql } from "drizzle-orm";
import { Hono } from "hono";

import { getDb } from "../db";
import { conflict, forbidden, notFound, tooManyRequests } from "../http";
import { getAuthUser, optionalAuth, requireAuth } from "../middleware/auth";
import { jsonObject, isoDateTime } from "../serialize";
import {
  getUserCapacities,
  incrementQuestProgress,
  questProgressUpdate,
} from "../services/progression";
import { broadcastRealtime } from "../services/realtime";
import { moderateText, recordModerationLog } from "../services/moderation";
import { expireBillboards } from "../services/rotations";
import type { AppBindings } from "../types";

type BillboardRow = {
  authorId: string;
  authorUsername: string;
  body: string;
  campusId: string;
  createdAt: Date | string;
  emptyExpiresAt: Date | string;
  expiresAt: Date | string;
  id: string;
  lat: number;
  lng: number;
  placementCount: number;
  status: "active" | "hidden" | "pending" | "rejected" | "removed";
};

type PlacementRow = {
  authorId: string;
  authorUsername: string;
  billboardId: string;
  body: string | null;
  createdAt: Date | string;
  id: string;
  kind: "sticker" | "sticky_note";
  pngBase64: string | null;
  stickerAssetCreatedAt: Date | string | null;
  stickerAssetId: string | null;
  stickerOwnerId: string | null;
  stickerPalette: Record<string, unknown> | null;
  stickerStatus: "active" | "hidden" | "pending" | "rejected" | "removed" | null;
  stickerWidth: number | null;
  stickerHeight: number | null;
  status: "active" | "hidden" | "pending" | "rejected" | "removed";
  x: number;
  y: number;
  zIndex: number;
};

export const billboardsRoute = new Hono<AppBindings>();

billboardsRoute.get("/billboards", optionalAuth, async (c) => {
  const db = getDb(c.env);

  await expireBillboards(db);

  const campusId = c.req.query("campusId");
  const rows = await db.execute<BillboardRow>(sql`
    select
      billboards.id,
      billboards.campus_id as "campusId",
      billboards.author_id as "authorId",
      users.username as "authorUsername",
      billboards.body,
      billboards.lat,
      billboards.lng,
      billboards.status,
      (
        select count(*)::int
        from app.billboard_placements
        where
          billboard_placements.billboard_id = billboards.id
          and billboard_placements.deleted_at is null
          and billboard_placements.hidden_at is null
          and billboard_placements.status = 'active'
      ) as "placementCount",
      billboards.empty_expires_at as "emptyExpiresAt",
      billboards.expires_at as "expiresAt",
      billboards.created_at as "createdAt"
    from app.billboards
    join app.users on users.id = billboards.author_id
    where
      billboards.deleted_at is null
      and billboards.hidden_at is null
      and billboards.status = 'active'
      and billboards.expires_at > now()
      and (${campusId ?? null}::uuid is null or billboards.campus_id = ${campusId ?? null})
      and (${c.req.query("north") ?? null}::double precision is null or billboards.lat <= ${c.req.query("north") ?? null})
      and (${c.req.query("south") ?? null}::double precision is null or billboards.lat >= ${c.req.query("south") ?? null})
      and (${c.req.query("east") ?? null}::double precision is null or billboards.lng <= ${c.req.query("east") ?? null})
      and (${c.req.query("west") ?? null}::double precision is null or billboards.lng >= ${c.req.query("west") ?? null})
    order by billboards.created_at desc
    limit 100
  `);

  return c.json(
    listBillboardsResponseSchema.parse({
      billboards: rows.map(billboardSummary),
    }),
  );
});

billboardsRoute.get("/billboards/:id", optionalAuth, async (c) => {
  const db = getDb(c.env);
  const id = idSchema.safeParse(c.req.param("id"));

  if (!id.success) {
    notFound("Billboard not found.");
  }

  const billboard = await loadBillboard(db, id.data);
  const placements = await loadPlacements(db, id.data);

  return c.json(
    getBillboardResponseSchema.parse({
      billboard: {
        ...billboardSummary(billboard),
        placements: placements.map(placementResponse),
      },
    }),
  );
});

billboardsRoute.post(
  "/billboards",
  requireAuth,
  zValidator("json", createBillboardInputSchema),
  async (c) => {
    const db = getDb(c.env);
    const authUser = getAuthUser(c);
    const input = c.req.valid("json");
    const moderation = await moderateText(c.env, input.body);

    if (moderation.flagged) {
      forbidden("Billboard body failed moderation.");
    }

    const capacities = await getUserCapacities(db, authUser.id);
    const countRows = await db.execute<{ activeCount: number; todayCount: number }>(sql`
      select
        (
          select count(*)::int
          from app.billboards
          where
            author_id = ${authUser.id}
            and deleted_at is null
            and hidden_at is null
            and status = 'active'
            and expires_at > now()
        ) as "activeCount",
        (
          select count(*)::int
          from app.billboards
          where
            author_id = ${authUser.id}
            and (timezone('Australia/Sydney', created_at))::date =
              (timezone('Australia/Sydney', now()))::date
        ) as "todayCount"
    `);
    const counts = countRows[0]!;

    if (counts.todayCount >= capacities.dailyBillboardLimit) {
      tooManyRequests("Daily billboard posting limit reached.");
    }

    let replacedBillboardId: string | null = null;

    if (counts.activeCount >= capacities.maxConcurrentBillboards) {
      const replacedRows = await db.execute<{ id: string }>(sql`
        update app.billboards
        set deleted_at = now(), updated_at = now()
        where id = (
          select id
          from app.billboards
          where
            author_id = ${authUser.id}
            and deleted_at is null
            and hidden_at is null
            and status = 'active'
            and expires_at > now()
          order by created_at asc
          limit 1
        )
        returning id
      `);

      replacedBillboardId = replacedRows[0]?.id ?? null;
    }

    const insertRows = await db.execute<{ id: string }>(sql`
      insert into app.billboards (
        campus_id,
        author_id,
        body,
        lat,
        lng,
        location_point,
        status,
        moderation_summary
      )
      values (
        ${input.campusId},
        ${authUser.id},
        ${input.body},
        ${input.lat},
        ${input.lng},
        st_setsrid(st_makepoint(${input.lng}, ${input.lat}), 4326)::geography,
        'active',
        ${moderation.rawResponse ? JSON.stringify(moderation.rawResponse) : null}::jsonb
      )
      returning id
    `);
    const billboardId = insertRows[0]!.id;

    await recordModerationLog(db, "billboard", billboardId, moderation);

    const [billboard, progress] = await Promise.all([
      loadBillboard(db, billboardId),
      incrementQuestProgress(db, authUser.id, "leave_billboards"),
    ]);

    await broadcastRealtime(c.env, {
      billboardId,
      campusId: input.campusId,
      kind: "billboard_created",
    });

    return c.json(
      createBillboardResponseSchema.parse({
        billboard: billboardSummary(billboard),
        questProgress: progress.map(questProgressUpdate),
        replacedBillboardId,
      }),
    );
  },
);

billboardsRoute.delete("/billboards/:id", requireAuth, async (c) => {
  const db = getDb(c.env);
  const authUser = getAuthUser(c);
  const id = idSchema.safeParse(c.req.param("id"));

  if (!id.success) {
    notFound("Billboard not found.");
  }

  const billboard = await loadBillboard(db, id.data);

  if (billboard.authorId !== authUser.id && !authUser.isAdmin) {
    forbidden("Only the owner or an admin can delete this billboard.");
  }

  await db.execute(sql`
    update app.billboards
    set deleted_at = now(), updated_at = now()
    where id = ${id.data}
  `);
  await broadcastRealtime(c.env, {
    billboardId: id.data,
    campusId: billboard.campusId,
    kind: "billboard_deleted",
  });

  return c.json(deleteBillboardResponseSchema.parse({ deleted: true }));
});

billboardsRoute.post(
  "/billboards/:id/placements",
  requireAuth,
  zValidator("json", createPlacementInputSchema),
  async (c) => {
    const db = getDb(c.env);
    const authUser = getAuthUser(c);
    const id = idSchema.safeParse(c.req.param("id"));
    const input = c.req.valid("json");

    if (!id.success) {
      notFound("Billboard not found.");
    }

    const billboard = await loadBillboard(db, id.data);
    const body = input.kind === "sticky_note" ? input.body : null;
    const moderation = body ? await moderateText(c.env, body) : null;

    if (moderation?.flagged) {
      forbidden("Placement body failed moderation.");
    }

    const existingRows = await db.execute<{ count: number }>(sql`
      select count(*)::int as count
      from app.billboard_placements
      where billboard_id = ${id.data} and author_id = ${authUser.id} and deleted_at is null
    `);

    if ((existingRows[0]?.count ?? 0) > 0) {
      conflict("Only one placement is allowed per user per billboard.");
    }

    const stickerAssetId = input.kind === "sticker" ? input.stickerAssetId : null;

    const insertRows = await db.execute<{ id: string }>(sql`
      insert into app.billboard_placements (
        billboard_id,
        author_id,
        kind,
        x,
        y,
        z_index,
        sticker_asset_id,
        body,
        status,
        moderation_summary
      )
      values (
        ${id.data},
        ${authUser.id},
        ${input.kind},
        ${input.x},
        ${input.y},
        coalesce(
          (
            select max(z_index) + 1
            from app.billboard_placements
            where billboard_id = ${id.data}
          ),
          0
        ),
        ${stickerAssetId},
        ${body},
        'active',
        ${moderation?.rawResponse ? JSON.stringify(moderation.rawResponse) : null}::jsonb
      )
      returning id
    `);
    const placementId = insertRows[0]!.id;

    if (moderation) {
      await recordModerationLog(db, "placement", placementId, moderation);
    }

    const [placements, progress] = await Promise.all([
      loadPlacements(db, id.data),
      incrementQuestProgress(db, authUser.id, "place_stickers"),
    ]);
    const placement = placements.find((item) => item.id === placementId);

    if (!placement) {
      throw new Error("Placement was inserted but could not be loaded.");
    }

    if (billboard.authorId !== authUser.id) {
      await incrementQuestProgress(db, billboard.authorId, "receive_replies");
    }

    await broadcastRealtime(c.env, {
      billboardId: id.data,
      campusId: billboard.campusId,
      kind: "placement_created",
      placementId,
    });

    return c.json(
      createPlacementResponseSchema.parse({
        placement: placementResponse(placement),
        questProgress: progress.map(questProgressUpdate),
      }),
    );
  },
);

async function loadBillboard(db: ReturnType<typeof getDb>, id: string) {
  const rows = await db.execute<BillboardRow>(sql`
    select
      billboards.id,
      billboards.campus_id as "campusId",
      billboards.author_id as "authorId",
      users.username as "authorUsername",
      billboards.body,
      billboards.lat,
      billboards.lng,
      billboards.status,
      (
        select count(*)::int
        from app.billboard_placements
        where
          billboard_placements.billboard_id = billboards.id
          and billboard_placements.deleted_at is null
          and billboard_placements.hidden_at is null
          and billboard_placements.status = 'active'
      ) as "placementCount",
      billboards.empty_expires_at as "emptyExpiresAt",
      billboards.expires_at as "expiresAt",
      billboards.created_at as "createdAt"
    from app.billboards
    join app.users on users.id = billboards.author_id
    where
      billboards.id = ${id}
      and billboards.deleted_at is null
      and billboards.hidden_at is null
      and billboards.status = 'active'
      and billboards.expires_at > now()
  `);
  const billboard = rows[0];

  if (!billboard) {
    notFound("Billboard not found.");
  }

  return billboard;
}

async function loadPlacements(db: ReturnType<typeof getDb>, billboardId: string) {
  return db.execute<PlacementRow>(sql`
    select
      billboard_placements.id,
      billboard_placements.billboard_id as "billboardId",
      billboard_placements.author_id as "authorId",
      users.username as "authorUsername",
      billboard_placements.kind,
      billboard_placements.x,
      billboard_placements.y,
      billboard_placements.z_index as "zIndex",
      billboard_placements.body,
      billboard_placements.status,
      billboard_placements.created_at as "createdAt",
      sticker_assets.id as "stickerAssetId",
      sticker_assets.owner_id as "stickerOwnerId",
      sticker_assets.png_base64 as "pngBase64",
      sticker_assets.width as "stickerWidth",
      sticker_assets.height as "stickerHeight",
      sticker_assets.palette as "stickerPalette",
      sticker_assets.status as "stickerStatus",
      sticker_assets.created_at as "stickerAssetCreatedAt"
    from app.billboard_placements
    join app.users on users.id = billboard_placements.author_id
    left join app.sticker_assets on sticker_assets.id = billboard_placements.sticker_asset_id
    where
      billboard_placements.billboard_id = ${billboardId}
      and billboard_placements.deleted_at is null
      and billboard_placements.hidden_at is null
      and billboard_placements.status = 'active'
    order by billboard_placements.z_index asc, billboard_placements.created_at asc
  `);
}

function billboardSummary(row: BillboardRow) {
  return {
    authorId: row.authorId,
    authorUsername: row.authorUsername,
    body: row.body,
    campusId: row.campusId,
    createdAt: isoDateTime(row.createdAt),
    emptyExpiresAt: isoDateTime(row.emptyExpiresAt),
    expiresAt: isoDateTime(row.expiresAt),
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    placementCount: row.placementCount,
    status: row.status,
  };
}

function placementResponse(row: PlacementRow) {
  return {
    authorId: row.authorId,
    authorUsername: row.authorUsername,
    billboardId: row.billboardId,
    body: row.body,
    createdAt: isoDateTime(row.createdAt),
    id: row.id,
    kind: row.kind,
    status: row.status,
    stickerAsset: row.stickerAssetId
      ? {
          createdAt: isoDateTime(row.stickerAssetCreatedAt!),
          height: row.stickerHeight!,
          id: row.stickerAssetId,
          ownerId: row.stickerOwnerId!,
          palette: jsonObject(row.stickerPalette),
          pngBase64: row.pngBase64!,
          status: row.stickerStatus!,
          width: row.stickerWidth!,
        }
      : null,
    x: row.x,
    y: row.y,
    zIndex: row.zIndex,
  };
}
