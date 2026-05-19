# Hackathon

Initial monorepo scaffold for the UNSW Connect hackathon app.

## Stack

- [Expo](https://docs.expo.dev/) and Expo Router for the frontend
- [Cloudflare Workers](https://www.cloudflare.com/developer-platform/products/workers/) for deployment
- [Hono](https://hono.dev/) for the API
- Supabase Postgres with PostGIS for the database
- [mise](https://mise.jdx.dev/getting-started.html) for pinned local runtimes

## Project Structure

```txt
apps/app          Expo Router app for web now and mobile later
apps/api          Cloudflare Worker API using Hono
packages/db       Supabase/PostGIS reset SQL
packages/shared   Shared Zod schemas and TypeScript API contracts
```

## Prerequisites

- [mise](https://mise.jdx.dev/getting-started.html)
- [Bun](https://bun.sh)
- Cloudflare account access for deployment

## Local Setup

```sh
mise install
bun install
```

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
bun --cwd apps/app expo export -p web
```

## Checks

```sh
bun run check
```

## Deploying Manually

Deploy the Workers after GitHub Actions secrets are configured:

```sh
bun --cwd apps/api wrangler deploy
bun --cwd apps/app expo export -p web
bun --cwd apps/app wrangler deploy
```

## GitHub Actions Setup

The deploy workflow runs on pushes to `main` and via `workflow_dispatch`. Configure these repository secrets before using it:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_POOLER_DATABASE_URL`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `OPENAI_API_KEY`
- `EXPO_ACCESS_TOKEN` (optional; push notification calls are currently disabled)

The Cloudflare API token needs permission to deploy Workers and write Worker secrets. The deploy workflow syncs `SUPABASE_URL` and `SUPABASE_SECRET_KEY` into the API Worker before deploying.

The frontend build uses `EXPO_PUBLIC_API_URL` to point static web output at the deployed API route. The temporary deployment uses `https://jematala.takuk.me`, with API traffic routed under `/api/*`.

Cloudflare also needs a proxied DNS record for `jematala.takuk.me` in the `takuk.me` zone before the route resolves publicly. The deploy workflow configures Worker routes, but it does not create DNS records.
