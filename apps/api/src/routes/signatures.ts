import {
  equipSignatureInputSchema,
  equipSignatureResponseSchema,
  listMySignaturesResponseSchema,
  listSignaturesResponseSchema,
} from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { sql } from "drizzle-orm";
import { Hono } from "hono";

import { getAuthUser, requireAuth } from "../middleware/auth";
import { isoDateTime } from "../serialize";
import type { AppBindings } from "../types";

type CatalogRow = {
  id: string;
  key: string;
  name: string;
  assetBase64: string;
  streakDayRequired: number;
  active: boolean;
};

type MineRow = CatalogRow & {
  unlockedAt: Date | string;
  isEquipped: boolean;
};

const SIGNATURE_FEATURE_PERK_KEY = "note_signature";

export const signaturesRoute = new Hono<AppBindings>();

signaturesRoute.get("/signatures", async (c) => {
  const db = c.var.db;
  const rows = await db.execute<CatalogRow>(sql`
    select
      id,
      key,
      name,
      asset_base64 as "assetBase64",
      streak_day_required as "streakDayRequired",
      active
    from app.signatures
    where active
    order by streak_day_required
  `);

  return c.json(
    listSignaturesResponseSchema.parse({
      catalog: rows.map((row) => ({ ...row })),
    }),
  );
});

signaturesRoute.get("/users/me/signatures", requireAuth, async (c) => {
  const db = c.var.db;
  const authUser = getAuthUser(c);
  const [rows, featureRows] = await Promise.all([
    db.execute<MineRow>(sql`
      select
        signatures.id,
        signatures.key,
        signatures.name,
        signatures.asset_base64 as "assetBase64",
        signatures.streak_day_required as "streakDayRequired",
        signatures.active,
        user_signatures.unlocked_at as "unlockedAt",
        user_signatures.is_equipped as "isEquipped"
      from app.user_signatures
      join app.signatures on signatures.id = user_signatures.signature_id
      where user_signatures.user_id = ${authUser.id}
      order by signatures.streak_day_required
    `),
    db.execute<{ unlocked: boolean }>(sql`
      select exists (
        select 1
        from app.user_perk_unlocks
        join app.level_perks on level_perks.id = user_perk_unlocks.level_perk_id
        join app.perk_definitions on perk_definitions.id = level_perks.perk_id
        where user_perk_unlocks.user_id = ${authUser.id}
          and perk_definitions.key = ${SIGNATURE_FEATURE_PERK_KEY}
      ) as unlocked
    `),
  ]);

  return c.json(
    listMySignaturesResponseSchema.parse({
      signatureFeatureUnlocked: featureRows[0]?.unlocked ?? false,
      unlocked: rows.map((row) => ({
        isEquipped: row.isEquipped,
        signature: {
          active: row.active,
          assetBase64: row.assetBase64,
          id: row.id,
          key: row.key,
          name: row.name,
          streakDayRequired: row.streakDayRequired,
        },
        unlockedAt: isoDateTime(row.unlockedAt),
      })),
    }),
  );
});

signaturesRoute.patch(
  "/users/me/signature",
  requireAuth,
  zValidator("json", equipSignatureInputSchema),
  async (c) => {
    const db = c.var.db;
    const authUser = getAuthUser(c);
    const input = c.req.valid("json");

    await db.execute(sql`
      update app.user_signatures
      set is_equipped = false
      where user_id = ${authUser.id} and is_equipped
    `);

    if (input.signatureId !== null) {
      await db.execute(sql`
        update app.user_signatures
        set is_equipped = true
        where user_id = ${authUser.id} and signature_id = ${input.signatureId}
      `);
    }

    return c.json(
      equipSignatureResponseSchema.parse({
        equippedSignatureId: input.signatureId,
      }),
    );
  },
);
