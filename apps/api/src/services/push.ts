import { sql } from "drizzle-orm";

import type { getDb } from "../db";
import type { Env } from "../types";

type Database = ReturnType<typeof getDb>;

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function sendPushToUser(
  env: Env,
  db: Database,
  userId: string,
  message: {
    body: string;
    data?: Record<string, unknown>;
    title: string;
  },
) {
  const rows = await db.execute<{ token: string }>(sql`
    select token
    from app.push_tokens
    where user_id = ${userId} and revoked_at is null
    order by created_at desc
  `);

  if (rows.length === 0) {
    return;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${env.EXPO_ACCESS_TOKEN}`;
  }

  await fetch(EXPO_PUSH_URL, {
    body: JSON.stringify(
      rows.map((row) => ({
        body: message.body,
        data: message.data,
        sound: "default",
        title: message.title,
        to: row.token,
      })),
    ),
    headers,
    method: "POST",
  });
}

export async function sendDailyQuestReminder(env: Env, db: Database) {
  const rows = await db.execute<{ userId: string }>(sql`
    select users.id as "userId"
    from app.users
    where
      users.deleted_at is null
      and users.banned_at is null
      and (
        users.last_daily_claimed_on is null
        or users.last_daily_claimed_on < (timezone('Australia/Sydney', now()))::date
      )
      and exists (
        select 1
        from app.push_tokens
        where push_tokens.user_id = users.id and push_tokens.revoked_at is null
      )
  `);

  await Promise.all(
    rows.map((row) =>
      sendPushToUser(env, db, row.userId, {
        body: "A new campus quest is ready.",
        data: {
          kind: "daily_quest",
        },
        title: "Daily quest",
      }),
    ),
  );
}

export function isSydneyReminderWindow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    hour12: false,
    minute: "numeric",
    timeZone: "Australia/Sydney",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  return hour === 8 && minute < 30;
}
