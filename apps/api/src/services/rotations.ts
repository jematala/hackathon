import { sql } from "drizzle-orm";

import type { getDb } from "../db";

type Database = ReturnType<typeof getDb>;

export async function ensureDailyRotations(_db: Database) {
  void _db;
}

export async function expireBillboards(db: Database) {
  await db.execute(sql`
    update app.billboards
    set deleted_at = coalesce(deleted_at, now()), updated_at = now()
    where
      deleted_at is null
      and (
        expires_at <= now()
        or (
          empty_expires_at <= now()
          and not exists (
            select 1
            from app.billboard_placements
            where
              billboard_placements.billboard_id = billboards.id
              and billboard_placements.deleted_at is null
              and billboard_placements.hidden_at is null
          )
        )
      )
  `);
}
