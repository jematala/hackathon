import {
  createSavedStickerInputSchema,
  createSavedStickerResponseSchema,
  createStickerInputSchema,
  createStickerResponseSchema,
  deleteSavedStickerResponseSchema,
  idSchema,
  listSavedStickersResponseSchema,
} from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { sql } from "drizzle-orm";
import { Hono } from "hono";

import { getDb } from "../db";
import { conflict, forbidden, notFound } from "../http";
import { getAuthUser, requireAuth } from "../middleware/auth";
import { jsonObject, isoDateTime } from "../serialize";
import { getUserCapacities, incrementQuestProgress } from "../services/progression";
import { moderatePng, recordModerationLog } from "../services/moderation";
import type { AppBindings } from "../types";

type StickerAssetRow = {
  createdAt: Date | string;
  height: number;
  id: string;
  ownerId: string;
  palette: Record<string, unknown> | null;
  pngBase64: string;
  status: "active" | "hidden" | "pending" | "rejected" | "removed";
  width: number;
};

type SavedStickerRow = {
  body: string | null;
  createdAt: Date | string;
  id: string;
  kind: "sticker" | "sticky_note";
  label: string | null;
  stickerCreatedAt: Date | string | null;
  stickerHeight: number | null;
  stickerId: string | null;
  stickerOwnerId: string | null;
  stickerPalette: Record<string, unknown> | null;
  stickerPngBase64: string | null;
  stickerStatus: "active" | "hidden" | "pending" | "rejected" | "removed" | null;
  stickerWidth: number | null;
  userId: string;
};

export const stickersRoute = new Hono<AppBindings>();

stickersRoute.post(
  "/users/me/stickers",
  requireAuth,
  zValidator("json", createStickerInputSchema),
  async (c) => {
    const db = getDb(c.env);
    const authUser = getAuthUser(c);
    const input = c.req.valid("json");
    const moderation = await moderatePng(c.env, input.pngBase64);

    if (moderation.flagged) {
      forbidden("Sticker failed moderation.");
    }

    const rows = await db.execute<{ id: string }>(sql`
      insert into app.sticker_assets (
        owner_id,
        png_base64,
        width,
        height,
        palette,
        status,
        moderation_summary
      )
      values (
        ${authUser.id},
        ${input.pngBase64},
        ${input.width},
        ${input.height},
        ${input.palette ? JSON.stringify(input.palette) : null}::jsonb,
        'active',
        ${moderation.rawResponse ? JSON.stringify(moderation.rawResponse) : null}::jsonb
      )
      returning id
    `);
    const sticker = await loadStickerAsset(db, rows[0]!.id);

    await recordModerationLog(db, "sticker_asset", sticker.id, moderation);

    return c.json(createStickerResponseSchema.parse({ sticker: stickerAsset(sticker) }));
  },
);

stickersRoute.get("/users/me/saved-stickers", requireAuth, async (c) => {
  const db = getDb(c.env);
  const authUser = getAuthUser(c);
  const [rows, capacity] = await Promise.all([
    loadSavedStickers(db, authUser.id),
    getUserCapacities(db, authUser.id),
  ]);

  return c.json(
    listSavedStickersResponseSchema.parse({
      capacity: capacity.stickerSlots,
      stickers: rows.map(savedSticker),
    }),
  );
});

stickersRoute.post(
  "/users/me/saved-stickers",
  requireAuth,
  zValidator("json", createSavedStickerInputSchema),
  async (c) => {
    const db = getDb(c.env);
    const authUser = getAuthUser(c);
    const input = c.req.valid("json");
    const capacity = await getUserCapacities(db, authUser.id);
    const countRows = await db.execute<{ count: number }>(sql`
      select count(*)::int as count
      from app.saved_stickers
      where user_id = ${authUser.id} and deleted_at is null
    `);

    if ((countRows[0]?.count ?? 0) >= capacity.stickerSlots) {
      conflict("Saved sticker capacity reached.");
    }

    const rows = await db.execute<{ id: string }>(sql`
      insert into app.saved_stickers (user_id, kind, sticker_asset_id, body, label)
      values (
        ${authUser.id},
        ${input.kind},
        ${input.kind === "sticker" ? input.stickerAssetId : null},
        ${input.kind === "sticky_note" ? input.body : null},
        ${input.label ?? null}
      )
      returning id
    `);
    const saved = (await loadSavedStickers(db, authUser.id)).find(
      (item) => item.id === rows[0]!.id,
    );

    if (!saved) {
      throw new Error("Saved sticker was inserted but could not be loaded.");
    }

    await incrementQuestProgress(db, authUser.id, "save_stickers");

    return c.json(createSavedStickerResponseSchema.parse({ savedSticker: savedSticker(saved) }));
  },
);

stickersRoute.delete("/users/me/saved-stickers/:id", requireAuth, async (c) => {
  const db = getDb(c.env);
  const authUser = getAuthUser(c);
  const id = idSchema.safeParse(c.req.param("id"));

  if (!id.success) {
    notFound("Saved sticker not found.");
  }

  const rows = await db.execute<{ id: string }>(sql`
    update app.saved_stickers
    set deleted_at = now()
    where id = ${id.data} and user_id = ${authUser.id} and deleted_at is null
    returning id
  `);

  if (!rows[0]) {
    notFound("Saved sticker not found.");
  }

  return c.json(deleteSavedStickerResponseSchema.parse({ deleted: true }));
});

async function loadStickerAsset(db: ReturnType<typeof getDb>, id: string) {
  const rows = await db.execute<StickerAssetRow>(sql`
    select
      id,
      owner_id as "ownerId",
      png_base64 as "pngBase64",
      width,
      height,
      palette,
      status,
      created_at as "createdAt"
    from app.sticker_assets
    where id = ${id} and deleted_at is null
  `);
  const sticker = rows[0];

  if (!sticker) {
    notFound("Sticker asset not found.");
  }

  return sticker;
}

async function loadSavedStickers(db: ReturnType<typeof getDb>, userId: string) {
  return db.execute<SavedStickerRow>(sql`
    select
      saved_stickers.id,
      saved_stickers.user_id as "userId",
      saved_stickers.kind,
      saved_stickers.body,
      saved_stickers.label,
      saved_stickers.created_at as "createdAt",
      sticker_assets.id as "stickerId",
      sticker_assets.owner_id as "stickerOwnerId",
      sticker_assets.png_base64 as "stickerPngBase64",
      sticker_assets.width as "stickerWidth",
      sticker_assets.height as "stickerHeight",
      sticker_assets.palette as "stickerPalette",
      sticker_assets.status as "stickerStatus",
      sticker_assets.created_at as "stickerCreatedAt"
    from app.saved_stickers
    left join app.sticker_assets on sticker_assets.id = saved_stickers.sticker_asset_id
    where saved_stickers.user_id = ${userId} and saved_stickers.deleted_at is null
    order by saved_stickers.created_at desc
  `);
}

function stickerAsset(row: StickerAssetRow) {
  return {
    createdAt: isoDateTime(row.createdAt),
    height: row.height,
    id: row.id,
    ownerId: row.ownerId,
    palette: jsonObject(row.palette),
    pngBase64: row.pngBase64,
    status: row.status,
    width: row.width,
  };
}

function savedSticker(row: SavedStickerRow) {
  return {
    body: row.body,
    createdAt: isoDateTime(row.createdAt),
    id: row.id,
    kind: row.kind,
    label: row.label,
    stickerAsset: row.stickerId
      ? {
          createdAt: isoDateTime(row.stickerCreatedAt!),
          height: row.stickerHeight!,
          id: row.stickerId,
          ownerId: row.stickerOwnerId!,
          palette: jsonObject(row.stickerPalette),
          pngBase64: row.stickerPngBase64!,
          status: row.stickerStatus!,
          width: row.stickerWidth!,
        }
      : null,
    userId: row.userId,
  };
}
