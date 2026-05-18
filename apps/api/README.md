# API

Cloudflare Worker API built with Hono.

```sh
bun run dev
bun run typecheck
bun run db:migrate:local
```

Deploy from this workspace after Cloudflare secrets and the D1 binding are configured:

```sh
bun run db:migrate:remote
bun run deploy
```
