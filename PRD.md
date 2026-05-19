# PRD: Campus Connect

A location-based social exploration game for UNSW students.

---

## 1. Overview

Mobile app where students discover geofenced Points of Interest (POIs) around UNSW Kensington campus, leave billboard notes, and reply with pixel-art stickers. Progression via quests and levelling unlocks cosmetic perks and capacity upgrades.

**Core loop:** Explore campus → discover POIs → leave/read notes → reply with stickers → complete quests → level up → unlock perks → explore more.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Mobile framework | Expo (React Native) with native geofencing |
| Backend runtime | Hono on Cloudflare Workers |
| Database | PostgreSQL + PostGIS on Supabase (no RLS) |
| ORM | Drizzle |
| Auth | Clerk (social login only — Google, Apple) |
| Maps | Leaflet + OSM (provider TBD) |
| Content moderation | OpenAI Moderation API |
| Real-time | WebSockets |
| Push notifications | Expo Push Notifications |
| Monorepo | Bun workspaces (`apps/app`, `apps/api`, `packages/db`, `packages/shared`) |

---

## 3. Map & Location

- 2D top-down map centered on UNSW Kensington campus
- User sees: their own location dot, POI markers, and billboard notes
- **No other users are visible** on the map — anonymity of presence
- POI geofence radius: ~20–50m (TBD, tuned during playtesting)
- Map provider decision deferred — Leaflet + OSM as starting assumption

---

## 4. Points of Interest (POIs)

- **5–10 concurrent POIs** placed by developers
- POIs are visually distinct from notes (e.g. glowing markers vs. note icons)
- **Rotation:** every 24 hours, some POIs disappear and new ones appear
- **First visit** to a POI awards XP
- Visited POIs are recorded to prevent repeat XP farming

---

## 5. Notes (Billboards) & Replies (Stickers / Sticky Notes)

### 5.1 Billboards (text notes)

- Placed by users at their current real-world location
- **Limit:** 3 concurrent notes at a time (scales with level, max 10/day)
- Always display a **username pill** above them
- Take up ~60% of viewport height when expanded
- Passed through OpenAI Moderation API before publishing

### 5.2 Stickers & Sticky Notes (replies)

- **Stickers:** 64×64 pixel art canvas, fixed 8-colour palette, drawn in-app
- **Sticky notes:** text replies (look like sticky notes)
- **1 reply per user per billboard** (unlimited replies total across billboards)
- Cannot reply to a sticker with the same sticker
- Tapping a sticker reveals a **username pill** above it
- Stickers can be **saved to a collection** and reused in other conversations
- Sticky notes can also be saved and reused like stickers

### 5.3 Moderation flow

1. User submits content
2. Backend calls OpenAI Moderation API
3. If flagged → content rejected, user notified
4. If passed → content published
5. Other users can report content AI may have missed

### 5.4 Expiry

- If a billboard receives **no replies for 24 hours**, it soft-deletes
- The entire thread (billboard + all replies) soft-deletes together
- Saved stickers/sticky notes persist in the user's collection regardless

---

## 6. Progression

### 6.1 Quests (milestone-based)

A **quest** is a specific objective. Completing it awards XP.

Main quest examples:
- Visit your first POI
- Leave your first billboard
- Receive your first sticker reply
- Save a sticker to your collection
- Reply to 5 different billboards
- Visit 3 POIs in one day

**Levelling:** complete all quests in a tier → level up. Higher tiers require more quests.

### 6.2 Daily quests & streaks

- Daily quests rotate each day, separate from the main quest tree
- Completing the daily quest maintains the streak
- Streaks grant bonus rewards (cosmetics, XP multipliers)
- Push notification each day to remind users

### 6.3 Perks by level

| Level | Perk |
|---|---|
| 1 (base) | 3 concurrent notes, 10 sticker slots |
| 2 | +1 concurrent note (4 total) |
| 3 | +2 sticker slots (12 total) |
| 4 | Cosmetic: signature on notes/stickers |
| 5 | +1 concurrent note (5 total) |
| 6 | Note border flair |
| 7 | +2 sticker slots (14 total) |
| 8 | +1 concurrent note (6 total) |
| 9 | Unique sticker colour palette expansion |
| 10 | Maxed: 10 concurrent notes, 20 sticker slots, all flairs |

---

## 7. User Identity

- Public usernames displayed on notes/stickers (incentivises good behaviour)
- Auth via Clerk with social login (Google, Apple)
- No anonymous posting

---

## 8. Real-time & Notifications

- **WebSockets** for live updates: new notes, new replies, POI rotations appear instantly
- **Push notifications:** daily quest reminder, reply received, new POI nearby

---

## 9. Admin & Safety

### 9.1 Reporting system
- Users can report any note or sticker
- Reports go to an admin panel

### 9.2 Admin panel
- View reported content with context
- Take action: hide, remove, warn user, ban user
- Soft-delete model: hidden content is retained in DB

### 9.3 Analytics dashboard
- Active users (DAU/WAU/MAU)
- Popular POIs (visit counts)
- Note/sticker volume over time
- Abuse metrics (report rate, flagged content rate)

---

## 10. UI/UX Notes

### 10.1 Visual Style

- **Art direction:** pixel art focus, inspired by *Pikmin Bloom* and *Webfishing*
- **Typography:** Jersey 10 font throughout the entire app
- **Colour palette:**
  - **Map/UI base:** earthy tones — warm greens, browns, tans
  - **Stickers:** vibrant, saturated colours (pop against the earthy UI)
  - **Notes/billboards:** parchment or wood tones with ink-like text
- **Cozy, handcrafted feel** — rough edges, pixel borders, no sharp modern UI chrome

### 10.2 Layout & Interaction

- Map is the primary navigation surface
- Billboard expanded view: ~60vh overlay on mobile
- Username pills float above billboards (always visible) and stickers (visible on tap)
- POI markers are visually distinct from billboard markers
- In-app pixel art editor: 64×64 grid, fixed 8-colour palette, tap-to-fill
- Colour palette and cosmetic flairs unlock with level

---

## 11. Open Questions / TBD

- POI geofence trigger radius (20m, 30m, 50m?)
- Map provider final decision (Leaflet vs. `react-native-maps` with OSM tiles)
- Sticker storage format (base64 PNG, SVG path data, custom binary grid?)
- Initial quest pool — list of ~20 quests to start
- Daily quest variety — initial rotation pool
- Push notification timing (morning? evening? configurable?)
