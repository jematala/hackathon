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

# DB reset (local only, needs .env with CLOUDFLARE_D1_DATABASE_ID)
bun run --cwd packages/db reset:local

# Deploy (after CI secrets configured — see README.md for list)
bun --cwd apps/api wrangler deploy
bun --cwd apps/app wrangler deploy          # static SPA via CF Workers assets
```

## Architecture

- **Monorepo** (Bun workspaces): `apps/app` (Expo Router, entrypoint: `expo-router/entry`), `apps/api` (Hono on CF Workers), `packages/db` (SQL reset), `packages/shared` (Zod schemas + types)
- **No RLS** — DB logic lives in the Hono API worker. Drizzle ORM is used for D1 schema/query helpers.
- **Auth**: Clerk (social login only — Google, Apple). No email/password.
- **Real-time**: Durable Objects manage WebSocket connections.
- **Two CF Workers**: `jematala-api` (`jematala.takuk.me/api/*`), `jematala-app` (`jematala.takuk.me/*`)
- **/events routes are scaffold placeholders** — PLAN.md says to replace them with map, billboard, studio, quests, profile routes.

## File system quirks

- Expo Router file-based routing under `apps/app/app/`. Native screens use `*.native.tsx` / `*.web.tsx` variants.
- `apps/app/` has `@/*` path alias (e.g. `@/components/Button`).
- Shared package subpath export: `@repo/shared/events`
- Path aliases in `tsconfig.base.json`: `@repo/db` → `packages/db/src`, `@repo/shared` → `packages/shared/src`
- Wrangler configs use `wrangler.jsonc` (not `.toml`), schema at `node_modules/wrangler/config-schema.json`
- DB uses **Cloudflare D1** — `packages/db/d1/schema.sql` creates local reset tables and seed data
- Shared package exports domain schemas via `@repo/shared` and subpaths such as `@repo/shared/poi`, `@repo/shared/billboard`, `@repo/shared/quest`, and `@repo/shared/user`
- Node 25, Bun latest (pinned via mise)
- `bun.lock` is checked in; CI uses `--frozen-lockfile`
- **Drizzle ORM** for D1 queries (not Prisma)
- **Maps**: `react-native-leaflet-view` + OSM
- **Icons**: `lucide-react-native`, `@expo/vector-icons`, and `expo-symbols` all available
- **HTTP client**: `@tanstack/react-query` for data fetching in the app
- **Animations**: `react-native-reanimated` + `react-native-gesture-handler` available
- **Content moderation**: OpenAI Moderation API (called from API worker)
- **Push**: Expo Push Notifications
- **Expo 54**, **React 19.1**, **React Native 0.81**, new architecture enabled
- **react-compiler** enabled in `app.json` (`experiments.reactCompiler: true`)

## Stack quirks

- Expo web output is a static SPA; dynamic routes client-side via Expo Router.
- Node 25, Bun latest (pinned via mise). `bun.lock` checked in.
- **D1** DB — `packages/db/d1/schema.sql` creates local reset tables and seed data.
- DB reset: source `.env` first (`set -a; source .env; set +a`) then `bun run --cwd packages/db reset:local`.
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
