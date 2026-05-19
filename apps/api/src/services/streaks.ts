import { sql } from "drizzle-orm";

import type { getDb } from "../db";

type Database = ReturnType<typeof getDb>;

export async function resetBrokenStreaks(db: Database) {
  await db.execute(sql`
    update app.users
    set daily_streak = 0, updated_at = now()
    where
      daily_streak > 0
      and (
        last_daily_claimed_on is null
        or last_daily_claimed_on < (timezone('Australia/Sydney', now()))::date - interval '1 day'
      )
  `);
}
