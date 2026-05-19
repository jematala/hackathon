# Campus Connect — Development Plan

## Team Structure

| Person | Role | Primary Focus |
|--------|------|---------------|
| **BE1** | Backend Lead | DB schema, Drizzle ORM, API routes (POI, billboard, sticker, quest, user), auth middleware, deployment |
| **BE2** | Backend | Durable Object (WebSocket), content moderation, push notifications, reporting/admin API |
| **FE1** | Frontend Lead | Navigation/routing, auth UI, map component, POI display, app theme/styling, admin panel |
| **FE2** | Frontend | Billboard expanded view, pixel art sticker editor, sticker/sticky note placement, quest UI, profile screen, push notification handling |

---

## Phase 0 — Domain Alignment & Data Model (Everyone, together first)

- [ ] **All 4** — Whiteboard the domain model: User, POI, Billboard, Placement (Sticker/StickyNote), Quest, DailyQuest, UserProgress, Report
- [ ] **BE1** — Write `packages/db/supabase/reset.sql` with all real tables
- [ ] **BE1** — Write Drizzle schema in `packages/db/src/schema/`
- [ ] **BE1** — Write shared Zod schemas in `packages/shared/src/` (poi, billboard, sticker, quest, user, report)
- [ ] **BE1** — Delete old `events`-related code from `packages/shared/src/events.ts`
- [ ] **All 4** — Agree on sticker storage format, admin role mechanism, map provider for mobile

> **Dependency edge:** Everything else depends on the shared schemas and DB schema.

---

## Phase 1a — Foundation: Backend

- [ ] **BE2** — Set up Clerk JWKS verification middleware in `apps/api/src/middleware/auth.ts`
- [ ] **BE2** — Set up Drizzle driver + Supabase connection in `apps/api/src/db.ts`
- [ ] **BE2** — Restructure `apps/api/src/index.ts` — split into route modules (`/pois`, `/billboards`, `/stickers`, `/quests`, `/users`, `/admin`)

---

## Phase 1a — Foundation: Frontend

- [ ] **FE1** — Replace app navigation: drop `/events` screens, add `/map`, `/billboard/[id]`, `/profile`, `/quests`, `/studio` routes
- [ ] **FE1** — Integrate Clerk (`@clerk/clerk-expo`) — sign-in/sign-up screens, `useAuth`/`useUser` hooks
- [ ] **FE1** — Install Leaflet and render a basic 2D top-down map on `/map`
- [ ] **FE1** — Set up global theme: Jersey 10 font, earthy colour palette tokens, pixel-art border styles
- [ ] **FE2** — Build reusable UI components: `UsernamePill`, `BillboardCard`, `StickerGrid`, `LevelBadge`, `QuestCard`, `POIMarker`
- [ ] **FE2** — Build map overlay components: POI popup, billboard marker callout

---

## Phase 1b — Core API & DB Wiring

- [ ] **BE1** — POI API: `GET /api/pois` (list active), `GET /api/pois/:id`, `POST /api/pois` (admin), `POST /api/pois/:id/visit`
- [ ] **BE1** — Billboard API: `GET /api/billboards`, `GET /api/billboards/:id`, `POST /api/billboards` (create + moderation), `DELETE /api/billboards/:id`
- [ ] **BE1** — Sticker/Placement API: `POST /api/billboards/:id/placements`, `GET /api/users/me/stickers`
- [ ] **BE2** — OpenAI Moderation API integration (`apps/api/src/services/moderation.ts`)
- [ ] **BE2** — Quest/levelling API: `GET /api/quests`, `POST /api/quests/:id/complete`, `GET /api/users/me/progress`, level-up logic

---

## Phase 2 — Frontend Features

- [ ] **FE1** — Map: show POI markers with distinct glowing style
- [ ] **FE1** — Map: show billboard markers with note icon style
- [ ] **FE1** — Map: show user's current location dot
- [ ] **FE1** — POI discovery UX: toast when entering geofence + quest progress trigger
- [ ] **FE2** — Billboard expanded view (~60vh overlay): text + username pill + all placements (z-ordered)
- [ ] **FE2** — Pixel art sticker editor: 64×64 grid, 8-colour palette, tap-to-fill, save to collection
- [ ] **FE2** — Sticky note composer: text input, preview as sticky note, post to billboard

---

## Phase 3 — Progression, Profile & Real-time

- [ ] **BE1** — Daily quest rotation logic + streak tracking
- [ ] **BE1** — User profile API: `GET /api/users/:id`, `PATCH /api/users/me`
- [ ] **BE2** — Durable Object: WebSocket handler, Postgres connection, broadcast on mutations
- [ ] **BE2** — Expo Push Notification integration: register token, send on reply + daily reminder
- [ ] **FE1** — Quest screen: main quest tiers + daily quest + streak counter + progress bars
- [ ] **FE1** — Profile screen: level, perks unlocked, stats (notes placed, stickers saved, POIs visited)
- [ ] **FE1** — Level-up celebration animation/overlay
- [ ] **FE2** — WebSocket connection in app: connect to DO, listen for updates, refresh displayed data
- [ ] **FE2** — Saved stickers/sticky notes collection screen: browse, select, reuse

---

## Phase 4 — Admin, Reporting & Polish

- [ ] **BE2** — Reporting API: `POST /api/reports`, `GET /api/admin/reports`, `POST /api/admin/reports/:id/action`
- [ ] **BE2** — Analytics query endpoints: DAU, popular POIs, note volume, abuse metrics
- [ ] **FE1** — Admin panel screens: reported content list with context, action buttons, soft-delete indicators
- [ ] **FE1** — Analytics dashboard (simple stats grid)
- [ ] **FE2** — Polish: error states, loading skeletons, empty states, edge cases (24h expiry, 3-note limit, 1-placement/billboard limit)
- [ ] **FE2** — Pull-to-refresh on map + billboard screen

---

## Task Dependency Graph (simplified)

```
Phase 0 (Domain Model)
  ├─► Phase 1a BE (auth middleware, route structure, DB connection)
  │    └─► Phase 1b BE (POI, billboard, sticker, quest API)
  │         ├─► Phase 2 FE (map markers, billboard view, editor)
  │         └─► Phase 3 BE (DO WebSocket, push notifications)
  │              └─► Phase 3 FE (WebSocket, quest/profile screens)
  └─► Phase 1a FE (navigation, auth UI, map, theme, components)
       ├─► Phase 2 FE (map markers, billboard view, editor)
       ├─► Phase 3 FE (quest/profile screens, WS)
       └─► Phase 4 FE (admin panel, polish)

Phase 1b BE ──► Phase 4 BE (reporting, analytics)
                     └─► Phase 4 FE (admin panel, analytics)
```

---

## Key Architectural Decisions (confirmed)

- **Sticker storage:** base64 PNG blob — FE produces B64 string, sends to BE for moderation (B64 moderation via OpenAI)
- **Admin role:** `is_admin` boolean column on `app.users`
- **Map on mobile:** `react-native-leaflet-view` (pavel-corsaghin/react-native-leaflet)
- **Drizzle migrations:** Drizzle Kit with `drizzle-kit push` for hackathon speed
- **POI rotation:** scheduled Worker (cron trigger)
- **24h expiry:** scheduled Worker (soft-delete expired billboards)
- **Daily quests / POIs:** managed via admin panel — POST endpoints for creating daily quests, POIs, etc.
