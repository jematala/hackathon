# Agents

> Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) for commit conventions and [`PLAN.md`](./PLAN.md) before starting work (defines phased build order and who owns what).

## Commands

```sh
bun install                # install (frozen lockfile in CI)
bun run dev:app            # Expo dev server (web)
bun run dev:api            # wrangler dev for API Worker
bun run check              # lint → format:check → typecheck (must pass CI)
bun run lint:fix           # oxlint --fix
bun run format             # oxfmt (auto-fix)
bun run format:check       # oxfmt --check
bun run typecheck          # all 4 workspace packages
bun run typecheck:app      # single-package typecheck
bun run build:app          # expo export -p web
bun run build:api          # wrangler deploy --dry-run

# DB reset (local only, needs .env with DATABASE_URL)
bun --cwd packages/db run reset:local

# Deploy (after CI secrets configured — see README.md for list)
bun --cwd apps/api wrangler deploy
bun --cwd apps/app wrangler deploy          # static SPA via CF Workers assets
```

## Architecture

- **Monorepo** (Bun workspaces): `apps/app` (Expo Router, entrypoint: `expo-router/entry`), `apps/api` (Hono on CF Workers), `packages/db` (SQL reset), `packages/shared` (Zod schemas + types)
- **No RLS** — DB logic lives in the Hono API worker. **Drizzle ORM planned but not yet installed.**
- **Auth**: Clerk (social login only — Google, Apple). No email/password.
- **Real-time**: Durable Objects manage WebSocket connections (planned).
- **Two CF Workers**: `jematala-api` (`jematala.takuk.me/api/*`), `jematala-app` (`jematala.takuk.me/*`)
- **/events routes are scaffold placeholders** — PLAN.md says to replace them with map, billboard, studio, quests, profile routes.

## File system quirks

- Expo Router file-based routing under `apps/app/app/`. Native screens use `*.native.tsx` / `*.web.tsx` variants.
- `apps/app/` has `@/*` path alias (e.g. `@/components/Button`).
- Shared package subpath export: `@repo/shared/events`
- Path aliases in `tsconfig.base.json`: `@repo/db` → `packages/db/src`, `@repo/shared` → `packages/shared/src`
- Wrangler configs use `wrangler.jsonc` (not `.toml`), schema at `node_modules/wrangler/config-schema.json`

## Stack quirks

- Expo web output is a static SPA; dynamic routes client-side via Expo Router.
- Node 25, Bun latest (pinned via mise). `bun.lock` checked in.
- **PostGIS** DB — `packages/db/supabase/reset.sql` creates the `app` schema and enables the extension.
- DB reset: source `.env` first (`set -a; source .env; set +a`) then `bun --cwd packages/db run reset:local`.
- `wrangler types --env-interface CloudflareBindings` generates binding types for the API worker.
- Expo typed routes enabled (`app.json` experiments).
- `react-compiler` enabled in `app.json`.
- **React Native 0.81**, **React 19.1**, **Expo 54**, new architecture enabled.

## Styling & UI conventions

- **Font**: Jersey 10 everywhere.
- **Art**: pixel art aesthetic. **Colours**: earthy greens/browns/tans; vibrant saturations for stickers.
- Prefer `lucide-react-native` icons, then `@expo/vector-icons`, then `expo-symbols`.
- `NativeWind` + `tailwindcss` installed but existing code uses `StyleSheet.create()` — either is fine.
- Theme tokens in `apps/app/app/theme.ts` (`colors`, `fonts`, `spacing`, `borderRadius`, `pixelBorder`).
