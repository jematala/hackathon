import * as schema from "@repo/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { Env } from "./types";

type Database = ReturnType<typeof drizzle<typeof schema>>;

export function getDb(env: Env) {
  if (!env.SUPABASE_POOLER_DATABASE_URL) {
    throw new Error("SUPABASE_POOLER_DATABASE_URL is not configured.");
  }

  const client = postgres(env.SUPABASE_POOLER_DATABASE_URL, {
    connect_timeout: 10,
    fetch_types: false,
    idle_timeout: 1,
    max: 1,
    prepare: false,
    ssl: "require",
  });

  return drizzle(client, { schema }) satisfies Database;
}
