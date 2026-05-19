# Campus Connect — Development Plan

## Team Structure

| Person  | Role          | Primary Focus                                                                                                                          |
| ------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **BE1** | Backend Lead  | DB schema, Drizzle ORM, API routes (POI, billboard, sticker, quest, user), auth middleware, deployment                                 |
| **BE2** | Backend       | Durable Object (WebSocket), content moderation, push notifications, reporting/admin API                                                |
| **FE1** | Frontend Lead | Navigation/routing, auth UI, map component, POI display, app theme/styling, admin panel                                                |
| **FE2** | Frontend      | Billboard expanded view, pixel art sticker editor, sticker/sticky note placement, quest UI, profile screen, push notification handling |

---

## Phase 0 — Domain Alignment & Data Model (Everyone, together first)

- [ ] **All 4** — Whiteboard the domain model: User, POI, Billboard, Placement (Sticker/StickyNote), Quest, DailyQuest, UserProgress, Report
- [x] **BE1** — Write `packages/db/supabase/reset.sql` with all real tables (POIs include picture column, users include avatar + is_admin columns)
- [x] **BE1** — Write Drizzle schema in `packages/db/src/schema/` (POI: picture field; User: avatar field)
- [x] **BE1** — Write shared Zod schemas in `packages/shared/src/` (poi includes optional picture, user includes avatar)
- [x] **BE1** — Delete old `events`-related code from `packages/shared/src/events.ts`
- [x] **All 4** — Agree on sticker storage format (base64 PNG), admin role mechanism (is_admin), map provider for mobile (react-native-leaflet-view), quest system (parameterised templates), daily quest pool (~5), push timing (8–9am), billboard limits (concurrent cap + Sydney-day posting cap)

- [x] **All 4** — Document commit practice: update PLAN.md before each commit (`CONTRIBUTING.md`)

> **Dependency edge:** Everything else depends on the shared schemas and DB schema.

---

## Phase 1a — Foundation: Backend

- [x] **BE2** — Set up Clerk JWKS verification middleware in `apps/api/src/middleware/auth.ts`
- [x] **BE2** — Set up Drizzle driver + Supabase connection in `apps/api/src/db.ts`
- [x] **BE2** — User profile API: avatar upload (base64 PNG) + `PATCH /api/users/me/avatar`
- [x] **BE2** — Restructure `apps/api/src/index.ts` — split into route modules (`/pois`, `/billboards`, `/stickers`, `/quests`, `/users`, `/admin`)

---

## Phase 1a — Foundation: Frontend

- [ ] **FE1** — Drop `/events` screens (still exist as stubs), add `/map`, `/profile`, `/quests` routes
- [x] **FE1** — Integrate Clerk (`@clerk/clerk-expo`) — sign-in/sign-up screens, `useAuth`/`useUser` hooks
- [x] **FE1** — Build avatar drawing screen (64×64 pixel art canvas, 8-colour palette) as part of sign-up flow
- [x] **FE1** — Install Leaflet (web) / MapLibre (native) and render a basic 2D top-down map on `/map`
- [x] **FE1** — Set up global theme: Jersey 10 font, earthy colour palette tokens, pixel-art border styles
- [x] **FE2** — Build reusable UI components: `UsernamePill`, `BillboardCard`, `StickerGrid`, `LevelBadge`, `QuestCard`, `POIMarker`
- [ ] **FE2** — Build map overlay components: POI popup (done), billboard marker callout

---

## Phase 1b — Core API & DB Wiring

- [x] **BE1** — POI API: `GET /api/pois` (list active), `GET /api/pois/:id`, `POST /api/pois` (admin — includes optional picture field), `POST /api/pois/:id/visit`
- [x] **BE1** — Billboard API: `GET /api/billboards`, `GET /api/billboards/:id`, `POST /api/billboards` (create + moderation), `DELETE /api/billboards/:id`
- [x] **BE1** — Sticker/Placement API: `POST /api/billboards/:id/placements`, `GET /api/users/me/stickers`
- [x] **BE2** — OpenAI Moderation API integration (`apps/api/src/services/moderation.ts`)
- [x] **BE2** — Quest/levelling API: `GET /api/quests`, `POST /api/quests/:id/claim`, `GET /api/users/me/progress`, level-up logic

---

## Phase 2 — Frontend Features

- [x] **FE1** — Map: show POI markers with distinct glowing style
- [ ] **FE1** — Map: show billboard markers with note icon style
- [x] **FE1** — Map: show user's current location as their 64×64 avatar (instead of a standard dot)
- [ ] **FE1** — POI discovery UX: toast when entering geofence + quest progress trigger
- [ ] **FE2** — Billboard expanded view (~60vh overlay): text + username pill + all placements (z-ordered)
- [x] **FE2** — Pixel art sticker editor (no save-to-collection flow yet)
- [ ] **FE2** — Sticky note composer: text input, preview as sticky note, post to billboard

---

## Phase 3 — Progression, Profile & Real-time

- [x] **BE1** — Daily quest rotation logic + streak tracking
- [x] **BE1** — User profile API: `GET /api/users/:id`, `PATCH /api/users/me`
- [x] **BE2** — Durable Object: WebSocket handler, Postgres connection, broadcast on mutations
- [ ] **BE2** — Expo Push Notification integration: register token, send on reply + daily reminder
- [ ] **FE1** — Quest screen: main quest tiers + daily quest + streak counter + progress bars
- [ ] **FE1** — Profile screen: level, perks unlocked, stats (notes placed, stickers saved, POIs visited)
- [ ] **FE1** — Level-up celebration animation/overlay
- [ ] **FE2** — WebSocket connection in app: connect to DO, listen for updates, refresh displayed data
- [ ] **FE2** — Saved stickers/sticky notes collection screen: browse, select, reuse

---

## Phase 4 — Admin, Reporting & Polish

- [x] **BE2** — Reporting API: `POST /api/reports`, `GET /api/admin/reports`, `POST /api/admin/reports/:id/action`
- [ ] **BE2** — Analytics query endpoints: DAU, popular POIs, note volume, abuse metrics
- [ ] **FE1** — Admin panel screens: reported content list with context, action buttons, soft-delete indicators, POI creation form (name, description, lat/lng, picture upload)
- [ ] **FE1** — Analytics dashboard (simple stats grid)
- [ ] **FE2** — Polish: error states, loading skeletons, empty states, edge cases (concurrent billboard replacement, Sydney-day posting limit, 24h inactive billboard expiry, 5-day billboard expiry, 1-placement/billboard limit)
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
- **Primary keys:** internal UUIDv4 values for all primary keys; Clerk user IDs are stored as unique external auth identifiers on `app.users.clerk_user_id`
- **Map on mobile:** `@maplibre/maplibre-react-native` (MapLibre GL)
- **Drizzle migrations:** Drizzle Kit with `drizzle-kit push` for hackathon speed
- **Billboard limits:** concurrent active cap starts at 3 and scales with level; posting at the cap soft-deletes the user's oldest active billboard before publishing the new one
- **Billboard daily limit:** separate Sydney calendar-day posting cap; seeded as concurrent + 1 and capped at 10/day
- **Billboard expiry:** derived from `empty_expires_at`/`expires_at` in active queries (empty billboards disappear after 24 hours; all billboards disappear after 5 days)
- **Daily quests:** seeded templates/pool; active quest is deterministically selected from the Sydney calendar day
- **POI rotation:** seeded/admin-created POI table; active POI set is deterministically selected from the campus calendar day
- **POI geofence radius:** 30m
- **Quest system:** parameterised templates (visit N POIs, leave N notes, place N stickers, receive N replies, save N stickers) with per-level randomised values and tier progression
- **Daily quest pool:** 5 curated seeded daily quests; one rotates each Sydney calendar day
- **Push notification timing:** 8–9am daily quest reminder when push is enabled
- **POI picture:** compressed 128×128 base64 PNG (stored inline in DB)
- **User avatar:** 64×64 pixel art drawn on sign-up, stored as base64 PNG in `users.avatar_base64` column

---

## Map Implementation (FE1)

### Tile Configuration

| Property     | Value                                                                     |
| ------------ | ------------------------------------------------------------------------- |
| Provider     | Thunderforest (Neighbourhood)                                             |
| URL          | `https://api.thunderforest.com/neighbourhood/{z}/{x}/{y}{r}.png?apikey=…` |
| CSS filter   | `sepia(0.3) saturate(0.8) brightness(0.8) contrast(150%)`                 |
| Pixel filter | `image-rendering: pixelated`                                              |
| Center       | UNSW Kensington (-33.917, 151.231)                                        |
| Default zoom | 18                                                                        |
| Max zoom     | 22 (scales z21 tiles at 22 via `maxNativeZoom: 21`)                       |

### File Structure

```
components/map/
├── Map.tsx       ← Leaflet ref-based wrapper (useEffect + useRef)
├── markers.ts    ← L.divIcon factories (POI, user avatar)
├── MapHUD.tsx    ← Floating bottom bar (Webfishing-style buttons)
```

### Navigation

```
app/
├── _layout.tsx            ← ClerkProvider + QueryClient + font loading + Leaflet CSS
├── index.tsx              ← Signed-in redirect → /map, signed-out → /sign-in
├── create.tsx             ← Standalone sticker maker page
├── (app)/
│   ├── _layout.tsx        ← Stack navigator (headerShown: false)
│   ├── index.tsx          ← Redirects to /map
│   ├── map.tsx            ← Map + MapHUD + CanvasModal (Studio button opens modal)
│   ├── quests.tsx         ← STUB: "Coming soon…"
│   └── profile.tsx        ← STUB: "Coming soon…"
├── (auth)/
│   ├── sign-in.tsx        ← Platform re-export
│   ├── sign-in.web.tsx    ← Clerk <SignIn>
│   ├── sign-in.native.tsx ← Clerk <AuthView>
│   ├── sign-up.tsx        ← Platform re-export
│   ├── sign-up.web.tsx    ← Clerk <SignUp>
│   └── sign-up.native.tsx ← Clerk <AuthView>
├── avatar/
│   └── create.tsx         ← 64×64 pixel art avatar editor
├── billboard/
│   └── [id].tsx           ← STUB: "Billboard" + id param
├── events/
│   ├── index.tsx          ← STUB (legacy — to be dropped)
│   └── [id].tsx           ← STUB (legacy — to be dropped)
└── profile/
    └── [userId].tsx       ← STUB: shows userId param
```

### Components

**Map.tsx** — Platform switch (Map.web / Map.native).

**Map.web.tsx** — Creates Leaflet map in a `useEffect` ref. Adds Thunderforest Neighbourhood tiles with CSS filter injection (sepia + saturation + brightness + contrast). Renders POI markers (wooden billboard divIcon) and user avatar marker (profile image with circular border + downward pointer triangle for location). Handles resize and cleanup. Avatar URL resolved via `expo-asset` (`Asset.fromModule`).

**Map.native.tsx** — Uses `@maplibre/maplibre-react-native` with same Thunderforest tile source. Custom `POIMarker` component (gold top circle + wooden main box + bar). Bottom sheet POI callout on tap. User avatar marker (circular frame + triangle pointer).

**markers.ts** — `createPOIIcon(title)` returns `L.divIcon` with small wooden billboard SVG. `createUserAvatarIcon(imageUrl)` returns avatar circle (profile image, `#5b7559` border) with a CSS triangle pointer at the bottom. Web-only (Leaflet divIcons).

**MapHUD.tsx** — Floating bottom bar (~20px from bottom, `absolute` positioning). Left section: profile picture (100×100) with elevation shadow, SVG data-URI XP progress ring (`#4A90D9`, 72%), and "lv22" level indicator (Jersey10, `#ffedd6`, 36px). Right section: "Quests" + "Studio" text buttons (forest green `#5b7559`, rounded 8px, Jersey10, `#ffedd6`). "Studio" opens `CanvasModal` overlay (not a route).

**PixelCanvas.tsx** — Platform switch (PixelCanvas.web / PixelCanvas.native).

**PixelCanvas.web.tsx** — Uses `dotting` library's `<Dotting>` component. 64×64 grid, provides `clear()` and `exportAsBase64()` via imperative handle.

**PixelCanvas.native.tsx** — Uses `react-native-webview` with inline HTML `<canvas>` element. Handles brush color, clear, and export via `postMessage`/`onMessage` bridge.

**CreateStickerPanel.tsx** — Full sticker editor UI: header, PixelCanvas, 8-colour palette swatches, action buttons (Clear, Download, Submit). Download uses browser download on web, `Share.share()` on native.

**CanvasModal.tsx** — Modal wrapper for CreateStickerPanel with dimmed backdrop. Used by MapHUD Studio button.

### Demo Data

Hardcoded in `constants/coordinates.ts`:

- UNSW center (-33.917, 151.231)
- 5 demo POIs around campus (Main Library, Science Theatre, Quad, Roundhouse, Mathews Building)

### Dependencies

| Package                       | Version | Purpose               |
| ----------------------------- | ------- | --------------------- |
| `leaflet`                     | latest  | Web map renderer      |
| `@types/leaflet`              | latest  | Web map types         |
| `@maplibre/maplibre-react-native` | ^10    | Native map renderer   |
| `dotting`                     | latest  | Web pixel canvas      |
| `react-native-webview`        | ^13.16  | Native pixel canvas   |

### Maps Backlog (post-hackathon)

- Wire POI data to live API
- POI discovery toast on geofence enter
- Billboard markers on map
- Real-time updates via Durable Object WebSocket
