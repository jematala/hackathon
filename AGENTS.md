# Agents

> Agents must refer to [`CONTRIBUTING.md`](./CONTRIBUTING.md) for commit practices, conventions, and getting-started instructions.

## Commands

```sh
bun install              # install (frozen lockfile in CI)
bun run dev:app          # Expo dev server (web now, mobile later)
bun run dev:api          # wrangler dev for the API Worker
bun run check            # lint → format:check → typecheck (must pass CI)
bun run lint:fix         # oxlint --fix
bun run format           # oxfmt (auto-fix formatting)
bun run format:check     # oxfmt --check
bun run typecheck        # typechecks all 4 workspace packages

# DB (local only, needs .env with DATABASE_URL)
bun --cwd packages/db run reset:local

# Deploy (after secrets configured in CI)
bun --cwd apps/api wrangler deploy
bun --cwd apps/app expo export -p web && bun --cwd apps/app wrangler deploy
```

## Architecture

- **Monorepo** (Bun workspaces): `apps/app` (Expo Router), `apps/api` (Hono on CF Workers), `packages/db` (SQL reset), `packages/shared` (Zod schemas + types)
- **API endpoint**: `EXPO_PUBLIC_API_URL` (defaults to `http://localhost:8787` in dev)
- **Two CF Workers**: `jematala-api` (routes under `jematala.takuk.me/api/*`), `jematala-app` (static SPA at `jematala.takuk.me/*`)
- **No RLS** — auth and DB logic lives in the Hono API worker
- **No test framework** installed yet
- **Auth**: Clerk (social login only — Google, Apple). No email/password.
- **Real-time**: Durable Objects manage WebSocket connections; real-time mutation results broadcast immediately to all connected clients

## Stack quirks

- Expo web output is a **static SPA** (`expo export -p web`); dynamic routes are client-side via Expo Router
- Wrangler configs use `wrangler.jsonc` (not `.toml`), schema at `node_modules/wrangler/config-schema.json`
- DB uses **PostGIS** — `packages/db/supabase/reset.sql` creates the `app` schema and enables the extension
- Shared package has a subpath export: `@repo/shared/events`
- Node 25, Bun latest (pinned via mise)
- `bun.lock` is checked in; CI uses `--frozen-lockfile`
- **Drizzle ORM** for Postgres queries (not Prisma)
- **Maps**: Leaflet + OSM (provider decision deferred)
- **Icons**: `lucide-react-native`, `@expo/vector-icons`, and `expo-symbols` all available
- **HTTP client**: `@tanstack/react-query` for data fetching in the app
- **Animations**: `react-native-reanimated` + `react-native-gesture-handler` available
- **Content moderation**: OpenAI Moderation API (called from API worker)
- **Push**: Expo Push Notifications
- **Expo 54**, **React 19.1**, **React Native 0.81**, new architecture enabled
- **react-compiler** enabled in `app.json` (`experiments.reactCompiler: true`)

## Design conventions

- **Font**: Jersey 10 throughout the app
- **Art style**: pixel art aesthetic (inspired by Pikmin Bloom / Webfishing)
- **Colour palette**: earthy greens, browns, tans for UI; vibrant saturated colours for stickers
- **Icons**: prefer `lucide-react-native` first, then `@expo/vector-icons`, then `expo-symbols`
- **Styling**: `NativeWind` + `tailwindcss` are installed, but existing scaffold code uses `StyleSheet.create()` — new code can use either

## Important gotchas

- **Order matters** for `bun run check`: lint → format:check → typecheck. Run `bun run check` locally before pushing.
- DB reset requires sourcing `.env` first (`set -a; source .env; set +a`)
- `wrangler types --env-interface CloudflareBindings` generates binding types for the API worker
- Expo typed routes are enabled (`experiments.typedRoutes: true`) in `app.json`
- No `.env` files committed — create from scratch or copy from team
