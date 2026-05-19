# PRD: Campus Connect

A location-based social exploration game for UNSW students.

---

## 1. Overview

Mobile app where students discover geofenced Points of Interest (POIs) around UNSW Kensington campus, leave billboard notes, and reply with pixel-art stickers. Progression via quests and levelling unlocks cosmetic perks and capacity upgrades.

**Core loop:** Explore campus → discover POIs → leave/read notes → reply with stickers → complete quests → level up → unlock perks → explore more.

---

## 2. Tech Stack

| Layer                       | Choice                                                                    |
| --------------------------- | ------------------------------------------------------------------------- |
| Mobile framework            | Expo (React Native) with native geofencing                                |
| API runtime (non-real-time) | Hono on Cloudflare Workers                                                |
| Real-time runtime           | Cloudflare Durable Objects (WebSockets, broadcasting)                     |
| Database                    | PostgreSQL + PostGIS on Supabase (no RLS)                                 |
| ORM                         | Drizzle                                                                   |
| Auth                        | Clerk (social login only — Google, Apple)                                 |
| Maps                        | react-native-leaflet-view + OSM                                           |
| Content moderation          | OpenAI Moderation API                                                     |
| Real-time transport         | WebSockets via Durable Objects                                            |
| Push notifications          | Expo Push Notifications                                                   |
| Monorepo                    | Bun workspaces (`apps/app`, `apps/api`, `packages/db`, `packages/shared`) |

---

## 3. Architecture

Cloudflare Workers are the entry point for all HTTP requests. Routing depends on the type of request:

| Request type       | Handler                                   | Example                                 |
| ------------------ | ----------------------------------------- | --------------------------------------- |
| Non-real-time GET  | CF Worker (Hono) → Postgres               | Fetch user profile, list saved stickers |
| Non-real-time POST | CF Worker (Hono) → Postgres               | Update user display name, settings      |
| Real-time GET      | Durable Object → Postgres (via WebSocket) | Query notes, POIs, and map data         |
| Real-time POST     | Durable Object → Postgres + broadcast     | Post a note, place a sticker            |
| WebSocket connect  | Durable Object (persistent connection)    | Live map updates, push notifications    |

Durable Objects manage persistent WebSocket connections for real-time features — querying notes and map data, broadcasting changes, and sending notifications. Mutations required for real-time functionality (e.g. posting notes, placing stickers) also run inside the Durable Object so the result can be broadcast immediately.

Non-real-time requests (e.g. updating user settings, fetching saved stickers) go through standard CF Workers with Hono and do not require a Durable Object.

---

## 4. Map & Location

- 2D top-down map centered on UNSW Kensington campus
- User sees: their own location dot, POI markers, and billboard notes
- **No other users are visible** on the map — anonymity of presence
- POI geofence radius: 30m (tuned during playtesting if needed)
- Map provider: react-native-leaflet-view with OSM tiles
- User represented on map by a 64×64 pixel art avatar drawn at sign-up

---

## 4. Points of Interest (POIs)

- **5–10 concurrent POIs** placed by developers
- POIs are visually distinct from notes (e.g. glowing markers vs. note icons)
- **Rotation:** every 24 hours, some POIs disappear and new ones appear
- **First visit** to a POI — on an individual user basis — advances quest progress, assuming the user has a relevant quest (daily or level-based). Visiting gives no direct XP.
- Visited POIs are recorded to prevent repeat quest progress from the same POI
- Optional picture: compressed 128×128 base64 PNG image (pixel-art icon or photo)

---

## 5. Notes (Billboards) & Replies (Stickers / Sticky Notes)

### 5.1 Billboards (text notes)

- Placed by users at their current real-world location
- **Limit:** 3 concurrent notes at a time (scales with level, max 10/day)
- Always display a **username pill** above them
- Take up ~60% of viewport height when expanded
- Passed through OpenAI Moderation API before publishing

### 5.2 Stickers & Sticky Notes (placements on billboards)

- **Stickers:** 64×64 pixel art canvas, fixed 8-colour palette, drawn in-app, stored as base64 PNG
- **Sticky notes:** text replies (look like sticky notes)
- **1 placement per user per billboard** (unlimited placements total across billboards)
- There is no threading — you cannot reply to another user's sticker/sticky note, only place on the billboard itself
- Later placements have **higher z-level** (appear on top of earlier ones)
- Tapping a sticker reveals a **username pill** above it
- Stickers can be **saved to a collection** and reused on other billboards
- Sticky notes can also be saved and reused like stickers

### 5.3 Moderation flow

1. User submits content
2. Backend calls OpenAI Moderation API
3. If flagged → content rejected, user notified
4. If passed → content published
5. Other users can report content AI may have missed

### 5.4 Expiry

- 24-hour period means a **calendar day** (midnight → 11:59pm), not a rolling window
- If a billboard receives **no placements by end of day**, it soft-deletes at midnight
- The entire billboard (all placements) soft-deletes together
- Saved stickers/sticky notes persist in the user's collection regardless

---

## 6. Progression

### 6.1 Quests (parameterised, tier-based)

A **quest** is a specific objective. Completing it awards XP. **Quests are the only way to earn XP** — visiting POIs, leaving notes, and receiving replies only matter for XP insofar as they complete quest objectives.

Quests are **parameterised templates** rather than fixed one-time objectives. Each quest type has a randomised numeric value per tier:

| Quest type                | Description                          |
| ------------------------- | ------------------------------------ |
| Visit N new POIs          | Discover N previously unvisited POIs |
| Leave N billboards        | Post N text notes                    |
| Place N stickers          | Place N sticker replies              |
| Receive N sticker replies | Get N stickers on your billboards    |
| Save N stickers           | Save N stickers to your collection   |

**Levelling:** each level tier generates a new set of quests with randomised values appropriate to the tier. Higher tiers require more quests per level and use larger value ranges. Completing all quests in a tier awards a level-up.

### 6.2 Daily quests & streaks

- Daily quests rotate each day, separate from the main quest tree (pool of ~5 curated daily quests)
- Completing the daily quest maintains the streak
- Streaks grant bonus rewards (cosmetics, XP multipliers)
- Push notification each day to remind users

### 6.3 Perks by level

| Level    | Perk                                                     |
| -------- | -------------------------------------------------------- |
| 1 (base) | 3 concurrent notes, 10 sticker slots                     |
| 2        | +1 concurrent note (4 total)                             |
| 3        | +2 sticker slots (12 total)                              |
| 4        | Cosmetic: signature on notes/stickers                    |
| 5        | +1 concurrent note (5 total)                             |
| 6        | Note border flair                                        |
| 7        | +2 sticker slots (14 total)                              |
| 8        | +1 concurrent note (6 total)                             |
| 9        | Unique sticker colour palette expansion                  |
| 10       | Maxed: 10 concurrent notes, 20 sticker slots, all flairs |

---

## 7. User Identity

- Public usernames displayed on notes/stickers (incentivises good behaviour)
- Auth via Clerk with social login (Google, Apple)
- No anonymous posting
- On sign-up, users draw a 64×64 pixel art avatar that represents them on the map

---

## 8. Real-time & Notifications

- **WebSockets via Durable Objects** for live updates: new notes, new sticker placements, POI rotations appear instantly without a refresh
- **Push notifications:** daily quest reminder (8–9am), reply received, new POI nearby
- The Durable Object handles all WebSocket connections, broadcasts changes to connected clients, and performs mutations needed for real-time features so results are immediately visible

---

## 9. Admin & Safety

### 9.1 Reporting system

- Users can report any note or sticker
- Reports go to an admin panel

### 9.2 Admin panel

- View reported content with context
- Take action: hide, remove, warn user, ban user
- Soft-delete model: hidden content is retained in DB
- Create/edit POIs: name, description, lat/lng (or map click), optional picture upload (128×128 compressed base64)

### 9.3 Analytics dashboard

- Active users (DAU/WAU/MAU)
- Popular POIs (visit counts)
- Note/sticker volume over time
- Abuse metrics (report rate, flagged content rate)

---

## 10. UI/UX Notes

### 10.1 Visual Style

- **Art direction:** pixel art focus, inspired by _Pikmin Bloom_ and _Webfishing_
- **Typography:** Jersey 10 font throughout the entire app
- **Colour palette:**
  - **Map/UI base:** earthy tones — warm greens, browns, tans
  - **Stickers:** vibrant, saturated colours (pop against the earthy UI)
  - **Notes/billboards:** parchment or wood tones with ink-like text
- **Cozy, handcrafted feel** — rough edges, pixel borders, no sharp modern UI chrome

### 10.2 Layout & Interaction

- Map is the primary navigation surface; user's 64×64 avatar replaces a standard location dot
- Billboard expanded view: ~60vh overlay on mobile
- Username pills float above billboards (always visible) and stickers (visible on tap)
- POI markers are visually distinct from billboard markers
- In-app pixel art editor: 64×64 grid, fixed 8-colour palette, tap-to-fill
- Colour palette and cosmetic flairs unlock with level

---

## 11. Key Decisions

| Question                         | Decision                               |
| -------------------------------- | -------------------------------------- |
| POI geofence trigger radius      | **30m**                                |
| Map provider                     | **react-native-leaflet-view** + OSM    |
| Sticker storage format           | **base64 PNG**                         |
| Quest system                     | **Parameterised templates** (visit N POIs, leave N notes, place N stickers, receive N replies, save N stickers) with per-level randomised values |
| Daily quest variety              | **Fixed pool of ~5** curated daily quests that rotate |
| Push notification timing         | **Morning (8–9am)**                    |
| POI picture format               | **Compressed 128×128 base64 PNG**     |
| User avatar format               | **64×64 pixel art, drawn on sign-up, stored as base64 PNG** |
