import * as schema from "@repo/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import type { AppContext, Env } from "./types";

export type Database = ReturnType<typeof drizzle<typeof schema>> & {
  $client: Sql;
};

export function createDb(env: Env) {
  if (!env.SUPABASE_POOLER_DATABASE_URL) {
    throw new Error("SUPABASE_POOLER_DATABASE_URL is not configured.");
  }

  const client = postgres(env.SUPABASE_POOLER_DATABASE_URL, {
    connect_timeout: 3,
    connection: {
      application_name: "jematala-api",
      lock_timeout: 1000,
      statement_timeout: 5000,
    },
    fetch_types: false,
    idle_timeout: 1,
    max: 1,
    prepare: false,
    ssl: "require",
  });

  return drizzle(client, { schema }) as Database;
}

export function getDb(c: AppContext) {
  const existingDb = c.get("db");

  if (existingDb) {
    return existingDb;
  }

  const db = createDb(c.env);
  c.set("db", db);

  return db;
}

export async function closeDb(db: Database) {
  await db.$client.end({ timeout: 1 });
}
