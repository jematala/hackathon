import * as schema from "@repo/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { Env } from "./types";

// One postgres client per request, shared by middleware + handlers, closed after
// the response. It is tempting to memoize this at module scope to skip the ~1s
// TCP+TLS+SCRAM handshake to the pooler, but Workers forbid it: a socket opened
// in one request cannot be touched by another ("Cannot perform I/O on behalf of
// a different request"), so the second request in an isolate throws.
//
export function getDb(env: Env) {
  if (!env.SUPABASE_POOLER_DATABASE_URL) {
    throw new Error("SUPABASE_POOLER_DATABASE_URL is not configured.");
  }

  // prepare: false is required behind Supavisor transaction mode (port 6543).
  const client = postgres(env.SUPABASE_POOLER_DATABASE_URL, {
    connect_timeout: 10,
    prepare: false,
  });

  return drizzle(client, { schema });
}
