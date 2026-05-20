import { sql } from "drizzle-orm";

import type { getDb } from "../db";

type Database = ReturnType<typeof getDb>;

export async function ensureDailyRotations(db: Database) {
  await db.execute(sql`
    insert into app.daily_quest_assignments (campus_id, active_on, daily_quest_pool_id)
    select
      campuses.id,
      (timezone(campuses.timezone, now()))::date,
      selected_pool.id
    from app.campuses
    cross join lateral (
      select id
      from app.daily_quest_pool
      where active
      order by random()
      limit 1
    ) selected_pool
    on conflict (campus_id, active_on) do nothing
  `);

  await db.execute(sql`
    insert into app.poi_daily_activations (campus_id, poi_id, active_on)
    select
      campuses.id,
      selected_pois.id,
      (timezone(campuses.timezone, now()))::date
    from app.campuses
    cross join lateral (
      select pois.id
      from app.pois
      where
        pois.campus_id = campuses.id
        and pois.is_active
        and pois.deleted_at is null
      order by random()
      limit 5
    ) selected_pois
    on conflict (campus_id, poi_id, active_on) do nothing
  `);
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
