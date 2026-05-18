# Hackathon

Initial monorepo scaffold for the UNSW Connect hackathon app.

## Stack

- [Expo](https://docs.expo.dev/) and Expo Router for the frontend
- [Cloudflare Workers](https://www.cloudflare.com/developer-platform/products/workers/) for deployment
- [Hono](https://hono.dev/) for the API
- [mise](https://mise.jdx.dev/getting-started.html) for pinned local runtimes

## Project Structure

```txt
apps/app          Expo Router app for web now and mobile later
apps/api          Cloudflare Worker API using Hono
packages/db       Drizzle schema and D1 migrations
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

`apps/app` is an Expo Router app. The web build is static SPA output, and dynamic routes such as `/events/[id]` are handled by Expo Router in the client.

## Running The API

```sh
bun run dev:api
```

`apps/api` owns server-side API routes. D1 is only accessed from the Worker, never directly from the frontend.

## D1 Local Migrations

```sh
bun --cwd apps/api wrangler d1 migrations apply DB --local
```

## Building Web

```sh
bun --cwd apps/app expo export -p web
```

## Checks

```sh
bun run check
```

## Deploying Manually

Create the D1 database if it does not exist yet:

```sh
bun --cwd apps/api wrangler d1 create unsw-connect-db
```

Paste the returned database ID into `apps/api/wrangler.jsonc`, then deploy:

```sh
bun --cwd apps/api wrangler d1 migrations apply DB --remote
bun --cwd apps/api wrangler deploy
bun --cwd apps/app expo export -p web
bun --cwd apps/app wrangler deploy
```

## GitHub Actions Setup

The deploy workflow runs on pushes to `main` and via `workflow_dispatch`. Configure these repository secrets before using it:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

The Cloudflare API token needs permission to deploy Workers, read/write D1, and apply D1 migrations.
