import * as schema from "@repo/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { Env } from "./types";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let cachedUrl: string | undefined;
let cachedDb: Database | undefined;

export function getDb(env: Env) {
  if (!env.SUPABASE_POOLER_DATABASE_URL) {
    throw new Error("SUPABASE_POOLER_DATABASE_URL is not configured.");
  }

  if (!cachedDb || cachedUrl !== env.SUPABASE_POOLER_DATABASE_URL) {
    const client = postgres(env.SUPABASE_POOLER_DATABASE_URL, {
      connect_timeout: 10,
      idle_timeout: 20,
      max: 1,
      prepare: false,
    });

    cachedDb = drizzle(client, { schema });
    cachedUrl = env.SUPABASE_POOLER_DATABASE_URL;
  }

  return cachedDb;
}
