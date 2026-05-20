import { sql } from "drizzle-orm";

import { nowSql, sydneyDateSql } from "../db";
import type { getDb } from "../db";

type Database = ReturnType<typeof getDb>;

export async function ensureDailyRotations(db: Database) {
  await db.execute(sql`
    insert into poi_daily_activations (campus_id, poi_id, active_on)
    with ranked_pois as (
      select
        campuses.id as campus_id,
        pois.id as poi_id,
        row_number() over (partition by campuses.id order by random()) as rotation_rank
      from campuses
      join pois on pois.campus_id = campuses.id
      where
        pois.is_active
        and pois.deleted_at is null
    )
    select campus_id, poi_id, ${sydneyDateSql()}
    from ranked_pois
    where rotation_rank <= 5
    on conflict (campus_id, poi_id, active_on) do nothing
  `);
}

export async function expireBillboards(db: Database) {
  await db.execute(sql`
    update billboards
    set deleted_at = coalesce(deleted_at, ${nowSql()}), updated_at = ${nowSql()}
    where
      deleted_at is null
      and (
        expires_at <= ${nowSql()}
        or (
          empty_expires_at <= ${nowSql()}
          and not exists (
            select 1
            from billboard_placements
            where
              billboard_placements.billboard_id = billboards.id
              and billboard_placements.deleted_at is null
              and billboard_placements.hidden_at is null
          )
        )
      )
  `);
}
