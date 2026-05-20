# Campus Connect

UNSW campus social map app for discovering POIs, posting billboards, drawing
pixel-art stickers and avatars, and completing daily quests.

## Stack

- Runtime and workspace tooling: Node 25, [Bun](https://bun.sh) workspaces, and
  [mise](https://mise.jdx.dev/getting-started.html) for pinned local runtimes
- App: [Expo 54](https://docs.expo.dev/), Expo Router, React 19.1, React Native
  0.81, React Native Web, and React Compiler
- Auth and data fetching: Clerk social login via `@clerk/expo`, plus
  `@tanstack/react-query`
- UI: Jersey 10 font, `StyleSheet.create()`, theme tokens in
  `apps/app/app/theme.ts`, `lucide-react-native`, `@expo/vector-icons`, and
  `expo-symbols`
- Maps: Leaflet on web and `@maplibre/maplibre-react-native` on native, using
  Thunderforest/OSM map tiles
- Pixel art tools: `dotting` for the web canvas and `react-native-webview` for
  the native canvas bridge
- API: [Cloudflare Workers](https://www.cloudflare.com/developer-platform/products/workers/),
  [Hono](https://hono.dev/), Clerk JWKS auth middleware, and Zod validators
- Realtime and scheduled jobs: Cloudflare Durable Objects for WebSocket fan-out
  and Worker cron triggers for rotations/expiry/streak maintenance
- Database: Supabase Postgres with PostGIS, Drizzle ORM, and Drizzle Kit
- Shared contracts: workspace Zod schemas and TypeScript types in
  `packages/shared`
- Moderation: OpenAI Moderation API from the API Worker
- Deployment: two Cloudflare Workers, `jematala-api` for `/api/*` and
  `jematala-app` for the static Expo web app

## Project Structure

```txt
apps/app          Expo Router app for web and native clients
apps/api          Cloudflare Worker API using Hono, Durable Objects, and cron
packages/db       Drizzle schema plus Supabase/PostGIS reset SQL
packages/shared   Shared Zod schemas and TypeScript API contracts
```

The main product routes are `/map`, `/quests`, `/profile`, `/avatar/create`,
`/create`, and `/billboard/[id]`. Legacy `/events` routes remain as stubs until
they are removed.

The API exposes routes for users, POIs, billboards, stickers/placements, quests,
reports, signatures, health checks, and realtime WebSocket connections.

## Prerequisites

- [mise](https://mise.jdx.dev/getting-started.html)
- [Bun](https://bun.sh) 1.3.14 or the version installed by `mise`
- Cloudflare account access for deployment
- Supabase project with a Postgres pooler URL
- Clerk application configured for social login
- OpenAI API key for content moderation

## Local Setup

```sh
mise install
bun install
```

Copy the required environment variables into `.env` before running the API,
database reset, or deployment commands.

## Running The Expo App

```sh
bun run dev:app
```

`apps/app` is an Expo Router app. The web build is static SPA output, and product routes are handled by Expo Router in the client.

## Running The API

```sh
bun run dev:api
```

`apps/api` owns server-side API routes. The frontend should not access the Supabase secret key or database directly.

## Database Changes

Drizzle owns the TypeScript schema in `packages/db/src/schema`. For hackathon
speed, schema pushes use Drizzle Kit:

```sh
bun --cwd packages/db run db:push
```

## Supabase PostGIS Reset

The temp database schema is intentionally resettable while the product schema is still moving. Do not run this from GitHub Actions.

```sh
set -a
source .env
set +a
bun --cwd packages/db run reset:local
```

`packages/db/supabase/reset.sql` drops and recreates only the `app` schema, enables PostGIS, and seeds demo data. Use the Supabase pooler URL for future non-destructive CI migrations if needed; keep full resets local/manual.

## Building Web

```sh
bun run build:app
```

## Checks

```sh
bun run check
```

This runs lint, format check, and TypeScript checks for all workspaces.

## Deploying Manually

Deploy the Workers after GitHub Actions secrets are configured:

```sh
bun --cwd apps/api wrangler deploy
bun run build:app
bun --cwd apps/app wrangler deploy
```

## GitHub Actions Setup

The deploy workflow runs on pushes to `main` and via `workflow_dispatch`. Configure these repository secrets before using it:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_POOLER_DATABASE_URL`
- `CLERK_PUBLISHABLE_KEY`
- `OPENAI_API_KEY`

The Cloudflare API token needs permission to deploy Workers, apply Durable Object migrations, write Worker secrets, and configure Worker routes. The API Worker deploy reads `apps/api/wrangler.jsonc`, so the `CAMPUS_REALTIME_ROOM` Durable Object binding, migration, and cron triggers are applied by the deploy run. Secrets are synced immediately after the API Worker exists.

The frontend build uses `EXPO_PUBLIC_API_URL` to point static web output at the deployed API route. The temporary deployment uses `https://jematala.takuk.me`, with API traffic routed under `/api/*`.

Cloudflare also needs a proxied DNS record for `jematala.takuk.me` in the `takuk.me` zone before the route resolves publicly. The deploy workflow configures Worker routes, but it does not create DNS records.
