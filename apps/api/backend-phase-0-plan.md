# Backend Phase 0 Plan

## Scope From PLAN.md

- Work on Phase 0 from [`PLAN.md`](../../PLAN.md): domain model, DB schema, Drizzle schema, shared Zod schemas, and removal of the old `events` scaffold.
- Phase 0 should not implement auth middleware, DB driver wiring, Hono route handlers, Durable Objects, moderation calls, push notifications, or admin dashboards yet.
- It should still define the API contracts expected by Phase 1b and later so FE/BE can build against stable schemas.
- No backward compatibility is needed; replace event terminology with the real product domain.
- The latest plan explicitly requires POI pictures, user avatars, parameterised quest templates, daily quest pools, and perk/level models.

## Confirmed Decisions To Reflect

- Sticker storage: base64 PNG blob produced by FE and stored by BE.
- POI picture storage: optional compressed 128x128 base64 PNG stored inline in the POI row.
- User avatar storage: 64x64 pixel art base64 PNG stored in `app.users.avatar_base64`.
- Admin role: `is_admin boolean` on `app.users`.
- Primary keys: internal UUIDv7 values for all primary keys; Clerk user IDs are unique external auth identifiers stored on `app.users.clerk_user_id`.
- UUIDv7 generation: `reset.sql` creates `app.uuidv7()` with `pgcrypto`; environments using `drizzle-kit push` need that helper installed before table creation because Drizzle table defaults call it.
- Map provider: `react-native-leaflet-view` with OSM tiles; backend still exposes lat/lng and campus bounds/provider config.
- Drizzle migrations: Drizzle Kit with `drizzle-kit push` for hackathon speed.
- POI rotation, empty-billboard expiry, daily quests, and POI/day setup are scheduled later-phase behavior, but Phase 0 needs schema support and seed data.
- Quest system: parameterised templates such as `visit_pois`, `leave_billboards`, `place_stickers`, `receive_replies`, and `save_stickers`, with generated per-level values.
- Daily quests: fixed curated seeded pool of about 5 templates; a scheduled job randomly assigns one per Sydney calendar day.
- POIs: seeded/admin-created table; a scheduled job randomly activates the daily POI set from that table.
- Billboard limits: no per-user concurrent billboard cap; enforce only the per-user Sydney calendar-day posting limit.
- Billboard expiry: empty billboards soft-delete at Sydney midnight, and every billboard soft-deletes after a hard maximum lifetime of 5 days.
- Quests are explicitly claimed: progress can become complete/claimable, and rewards are applied by a claim route.

## Phase 0 Deliverables

Update or create these files:

- [`packages/db/supabase/reset.sql`](../../packages/db/supabase/reset.sql): full reset SQL for the real tables, seed UNSW campus plus a few demo POIs/quests, and remove event tables.
- [`packages/db/src/schema/`](../../packages/db/src/schema/): Drizzle schema matching the SQL tables.
- [`packages/shared/src/poi.ts`](../../packages/shared/src/poi.ts): POI schemas and route contracts.
- [`packages/shared/src/billboard.ts`](../../packages/shared/src/billboard.ts): billboard and placement schemas.
- [`packages/shared/src/sticker.ts`](../../packages/shared/src/sticker.ts): sticker/sticky-note asset and collection schemas.
- [`packages/shared/src/quest.ts`](../../packages/shared/src/quest.ts): quest, progress, claim, and progression schemas.
- [`packages/shared/src/perk.ts`](../../packages/shared/src/perk.ts): perk definitions, level unlocks, and unlocked perk response schemas.
- [`packages/shared/src/user.ts`](../../packages/shared/src/user.ts): profile, current user, progress summary, and settings schemas.
- [`packages/shared/src/report.ts`](../../packages/shared/src/report.ts): report/admin moderation action schemas.
- [`packages/shared/src/index.ts`](../../packages/shared/src/index.ts): export the new domain modules.
- [`packages/shared/src/events.ts`](../../packages/shared/src/events.ts): delete or empty/remove exports, depending on import cleanup.

## Expected API Routes To Design Contracts For

These routes are not implemented in Phase 0, but the shared schemas should make their request and response shapes explicit.

POIs:

- `GET /api/pois`: list active POIs, optionally filtered by `campusId`.
- `GET /api/pois/:id`: POI detail with visit/active metadata.
- `POST /api/pois`: admin create/update input shape for POIs, including optional 128x128 base64 PNG picture.
- `POST /api/pois/:id/visit`: user visit input with current lat/lng; response includes whether this was the first visit and any quest progress changes.

Billboards:

- `GET /api/billboards`: list active billboards for a campus or viewport.
- `GET /api/billboards/:id`: billboard detail with placements ordered by z index.
- `POST /api/billboards`: create billboard at current lat/lng with text body.
- `DELETE /api/billboards/:id`: owner/admin soft-delete.

Stickers and placements:

- `POST /api/billboards/:id/placements`: place either a sticker or sticky note on a billboard, enforcing one placement per user per billboard.
- `GET /api/users/me/stickers`: saved sticker/sticky-note collection for reuse.
- Add collection create/delete schemas if the sticker editor needs them immediately: `POST /api/users/me/stickers`, `DELETE /api/users/me/stickers/:id`.

Quests and progress:

- `GET /api/quests`: current user's generated level quests and daily quest with progress.
- `POST /api/quests/:id/claim`: explicit reward claim.
- `GET /api/users/me/progress`: level, XP, streak, capacities, and stats.
- `GET /api/users/me/perks`: unlocked perks and next-level perks, or include this in `/api/users/me/progress`.

Users:

- `GET /api/users/:id`: public profile.
- `GET /api/users/me`: authenticated current user profile.
- `PATCH /api/users/me`: update username/display settings.
- `PATCH /api/users/me/avatar`: upload/update 64x64 base64 PNG avatar.
- Later push routes can use `POST /api/users/me/push-tokens`, but do not prioritize this in Phase 0 unless time allows.

Reports/admin:

- `POST /api/reports`: report a billboard or placement.
- `GET /api/admin/reports`: admin report queue.
- `POST /api/admin/reports/:id/action`: hide/remove/warn/ban action.
- Admin setup routes expected later by `PLAN.md`: create/update POIs. Daily quest templates/pool are seeded for MVP.

## Phase 0 SQL And Drizzle Model

Use `app` schema and PostGIS. The SQL reset and Drizzle schema should define the same tables.

Identity:

- `app.users`: UUIDv7 `id` primary key, unique `clerk_user_id`, username, display name, `avatar_base64`, `is_admin`, level, XP, streak fields, banned/deleted flags, timestamps. Do not reuse Clerk IDs as primary keys; map Clerk JWT `sub` to this row via `clerk_user_id`.
- `app.push_tokens`: optional Phase 0 table if quick; useful for Phase 3 push.

Campus and POIs:

- `app.campuses`: id, name, timezone, map center, radius/bounds.
- `app.pois`: campus id, title, description, optional `picture_base64`, location point, radius meters defaulting to 30m, active/admin fields.
- `app.poi_daily_activations` or `app.poi_rotations`: which seeded/admin-created POIs are randomly active for a Sydney date/campus.
- `app.poi_visits`: user id, POI id, visited date/time, unique first-visit constraint.

Billboards and placements:

- `app.billboards`: campus id, author id, text body, location point, status, moderation fields, expires/deleted timestamps. Track enough timestamps to enforce the PRD max of 10 billboards per Sydney calendar day and the 5-day maximum lifetime.
- `app.billboard_placements`: billboard id, author id, kind `sticker | sticky_note`, x/y, z index, sticker asset ref or text body, status, moderation fields. Unique `(billboard_id, author_id)`.

Stickers and collection:

- `app.sticker_assets`: owner id, base64 PNG data, width/height, palette metadata, moderation/status fields for OpenAI image moderation.
- `app.saved_stickers`: user collection rows pointing to sticker assets or saved sticky-note text, with capacity enforced in API.

Quests and perks:

- `app.quest_templates`: parameterised level quest template catalog. Columns should include `key`, `trigger_type`, `title_template`, `description_template`, `min_target`, `max_target`, `xp_reward`, and `active`.
- `app.level_quest_sets`: generated or seeded level/tier quest instances with `level`, `template_id`, `target_count`, `xp_reward`, and ordering.
- `app.daily_quest_templates`: parameterised daily quest template catalog, separate from level quests even when it uses the same trigger types.
- `app.daily_quest_pool`: curated daily quest candidates from `daily_quest_templates`, with target counts and XP tuned for daily play.
- `app.daily_quest_assignments`: date/campus selected daily quest(s), so every user sees the same daily rotation.
- `app.user_quest_progress`: user id, quest source/type, quest instance id, progress count, completed_at, claimable_at, claimed_at, claimed XP.
- `app.perk_definitions`: catalog of perks such as note capacity increase, sticker slot increase, note signature, note border flair, palette expansion.
- `app.level_perks`: maps each level to one or more perk definitions plus any numeric value, e.g. `daily_billboard_limit = 10`.
- `app.user_perk_unlocks`: records perks unlocked when a user reaches a level, useful for profile display, analytics, and future manual grants.
- `app.streak_reward_definitions`: optional catalog for daily streak bonus rewards such as cosmetics or XP multipliers. This can stay lightly modeled in Phase 0 but keeps the PRD streak reward path open.

Safety/admin:

- `app.reports`: reporter, target type/id, reason, status, admin notes.
- `app.moderation_actions`: admin action log for report outcomes.
- `app.content_moderation_logs`: OpenAI moderation response summary, target type/id, including sticker assets because saved stickers can outlive placements.

Indexes/constraints:

- GIST indexes for POI and billboard location points.
- Index active billboards by campus/status/expires_at.
- Unique usernames, unique report target per reporter if desired, unique POI first visits, unique placement per user per billboard.

## Shared Zod Contract Shape

Each domain file should export:

- DB-facing enum-like literals where useful, e.g. placement kind, report target type, content status.
- Request schemas for create/update/claim routes.
- Response schemas for list/detail routes.
- Inferred TypeScript types for app/API use.

Recommended naming examples:

- `poiSummarySchema`, `poiDetailSchema`, `listPoisResponseSchema`, `visitPoiInputSchema`, `visitPoiResponseSchema`.
- `billboardSummarySchema`, `billboardDetailSchema`, `createBillboardInputSchema`, `createPlacementInputSchema`.
- `stickerAssetSchema`, `savedStickerSchema`, `createStickerInputSchema`.
- `questTemplateSchema`, `dailyQuestTemplateSchema`, `levelQuestSchema`, `dailyQuestSchema`, `questProgressSchema`, `listQuestsResponseSchema`, `claimQuestResponseSchema`.
- `perkSchema`, `levelPerkSchema`, `unlockedPerkSchema`, `listUserPerksResponseSchema`.
- `userProfileSchema`, `currentUserSchema`, `userProgressSchema`, `updateCurrentUserInputSchema`, `updateAvatarInputSchema`.
- `createReportInputSchema`, `reportSchema`, `adminReportActionInputSchema`.

## Quest And Perk Model Detail

Model level quests and daily quests with separate templates plus generated/assigned instances:

- Level quest templates define long-term objective families: visit new POIs, leave billboards, place stickers, receive replies, save stickers.
- Daily quest templates define short daily objectives separately, even when they share trigger types with level quests.
- Level quest sets bind level templates to a level/tier with concrete target values, so level 1 can ask for small counts while later levels can increase difficulty.
- Daily quest pool rows are curated from daily templates and assigned by date/campus.
- User progress points at the concrete level quest or daily assignment, not only the template, so claims are stable even if templates change later.

Model perks as data, not hardcoded conditionals:

- `perk_definitions` names the capability, e.g. `daily_billboard_limit`, `sticker_slots`, `note_signature`, `note_border_flair`, `palette_expansion`.
- `level_perks` expresses the PRD table from levels 1-10.
- `user_perk_unlocks` is written when level-up happens after quest claims. The app can render unlocked perks from this table and next perks from `level_perks`.
- Derived capacities such as daily note limit and sticker slots should be returned in `userProgressSchema` so the frontend does not recalculate perk math.

Model expiry and caps from the PRD explicitly:

- Billboard day-based expiry uses the Australia/Sydney calendar. At the scheduled Sydney midnight job, only billboards with no placements are soft-deleted.
- All billboards also have a hard 5-day maximum lifetime and are soft-deleted with their placements after that point.
- Note limits include the PRD's max of 10 billboards per Sydney calendar day, with no per-user concurrent billboard cap.
- Keep `hidden_at` separate from `deleted_at`: `hidden_at` is a moderation visibility action, while `deleted_at` is lifecycle, owner, or expiry removal from active product surfaces.

## Later Phase Notes

- Phase 1a implements Clerk JWKS middleware, Drizzle driver/Supabase connection, and route module structure.
- Phase 1b implements the actual POI, billboard, sticker/placement, quest, and user APIs from the contracts above.
- Phase 3 adds Durable Object WebSockets. Keep one `CampusRealtimeRoomDO` class with one instance for UNSW in MVP; do not create DOs per message/billboard/POI.
- Do not add an app-level WebSocket `ping` message unless real device testing shows a need.

## Implementation Order For Phase 0

1. Rewrite [`packages/db/supabase/reset.sql`](../../packages/db/supabase/reset.sql) with the real `app` tables and seed data.
2. Add matching Drizzle schema files under [`packages/db/src/schema/`](../../packages/db/src/schema/).
3. Replace shared event schemas with the domain modules and route contracts above.
4. Seed the PRD level perks and the initial quest template/daily pool rows.
5. Run typecheck/format after implementation approval.
