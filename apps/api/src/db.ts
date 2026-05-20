import * as schema from "@repo/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { Env } from "./types";

export function getDb(env: Env) {
  if (!env.SUPABASE_POOLER_DATABASE_URL) {
    throw new Error("SUPABASE_POOLER_DATABASE_URL is not configured.");
  }

  const client = postgres(env.SUPABASE_POOLER_DATABASE_URL, {
    connect_timeout: 10,
    prepare: false,
  });

  return drizzle(client, { schema });
}
