import * as schema from "@repo/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { Env } from "./types";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let cachedUrl: string | undefined;
let cachedDb: Database | undefined;

export function getDb(env: Env) {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!cachedDb || cachedUrl !== env.DATABASE_URL) {
    const client = postgres(env.DATABASE_URL, {
      connect_timeout: 10,
      idle_timeout: 20,
      max: 1,
      prepare: false,
    });

    cachedDb = drizzle(client, { schema });
    cachedUrl = env.DATABASE_URL;
  }

  return cachedDb;
}
