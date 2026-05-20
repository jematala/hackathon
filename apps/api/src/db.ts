import * as schema from "@repo/db";
import { type SQLWrapper, sql } from "drizzle-orm";
import { type DrizzleD1Database, drizzle } from "drizzle-orm/d1";

import type { Env } from "./types";

type RawQuery = SQLWrapper | string;
export type Database = DrizzleD1Database<typeof schema> & {
  execute<T = unknown>(query: RawQuery): Promise<T[]>;
};

export function getDb(env: Env) {
  if (!env.DB) {
    throw new Error("D1 binding DB is not configured.");
  }

  const db = drizzle(env.DB, { schema });

  return Object.assign(db, {
    execute<T = unknown>(query: RawQuery) {
      return db.all<T>(query);
    },
  }) satisfies Database;
}

export function newId() {
  return crypto.randomUUID();
}

export function newIdSql() {
  return sql`
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  `;
}

export function nowSql() {
  return sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;
}

export function sydneyDateSql() {
  return sql`date('now', '+10 hours')`;
}
