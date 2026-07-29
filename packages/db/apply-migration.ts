// Runs a .sql migration file atomically against the pooler.
// Usage: bun packages/db/apply-migration.ts packages/db/supabase/<file>.sql
//
// postgres-js won't accept a raw `begin;`/`commit;` over the transaction-mode
// pooler, so we strip the file's own wrapper and drive one via sql.begin —
// which commits on success and rolls back on any error (atomic either way).
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.SUPABASE_POOLER_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set SUPABASE_POOLER_DATABASE_URL (source your .env first).");

const file = process.argv[2];
if (!file) throw new Error("Pass the .sql file path as the first argument.");

const body = readFileSync(file, "utf8")
  .replace(/^\s*begin\s*;/im, "")
  .replace(/commit\s*;/im, "");

const sql = postgres(url, { prepare: false });
try {
  await sql.begin(async (tx) => {
    await tx.unsafe(body);
  });
  console.log(`applied ${file}`);
} finally {
  await sql.end();
}
