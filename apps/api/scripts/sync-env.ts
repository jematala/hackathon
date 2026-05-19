// Copies the monorepo root `.env` into apps/api/.dev.vars so Wrangler picks
// the secrets up as Worker bindings. Run automatically as a `predev` step;
// safe to invoke manually with `bun run sync-env`.
//
// Why this exists: Wrangler only reads `.dev.vars` from the worker's own
// directory. Keeping the source of truth in a single root `.env` means
// secrets are edited in one place instead of duplicated across workspaces.

import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const here = import.meta.dir;
const rootEnv = resolve(here, "../../..", ".env");
const devVars = resolve(here, "..", ".dev.vars");

if (!existsSync(rootEnv)) {
  console.warn(
    `[sync-env] No root .env at ${rootEnv} — wrangler will fall back to .dev.vars if present.`,
  );
  process.exit(0);
}

copyFileSync(rootEnv, devVars);
console.log(`[sync-env] ${rootEnv} → ${devVars}`);
