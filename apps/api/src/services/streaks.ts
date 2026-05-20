import { sql } from "drizzle-orm";

import { nowSql } from "../db";
import type { getDb } from "../db";

type Database = ReturnType<typeof getDb>;

export async function resetBrokenStreaks(db: Database) {
  await db.execute(sql`
    update users
    set daily_streak = 0, updated_at = ${nowSql()}
    where
      daily_streak > 0
      and (
        last_daily_claimed_on is null
        or last_daily_claimed_on < date('now', '+10 hours', '-1 day')
      )
  `);
}
