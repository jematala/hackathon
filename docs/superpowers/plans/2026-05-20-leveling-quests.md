# Leveling & Quest System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the leveling/quest system per `docs/superpowers/specs/2026-05-20-leveling-quests-design.md`: two parallel tracks (level quests as the only path to leveling up; daily quests as a streak-only track with milestone unlocks), revised level perk table capped at 5 concurrent billboards, and streak unlocks at days 3/7/14/30 (3× signatures + 1× capacity perk).

**Architecture:** The existing schema and services already match ~80% of the spec — the work is **deltas**, not a rewrite. Seed data changes drive most of the gameplay tuning. The biggest code changes are: (a) the claim flow stops awarding XP for daily quests; (b) a new streak-break path runs on the existing CF `scheduled()` cron; (c) two small new tables (`signatures`, `user_signatures`) and a new shared schema for streak rewards that support a `capacity_billboard` variant; (d) capacity computation in `getUserCapacities` extends to streak perks. Frontend deltas are confined to `QuestCard` (daily reward label), a new `NextMilestonePreview`, and a signature picker on the profile screen (gated by L4).

**Tech Stack:** Bun workspaces · Cloudflare D1 · Drizzle ORM · Drizzle Kit (push) · Hono on Cloudflare Workers · Zod (shared schemas) · Expo / React Native · React Native Leaflet (not touched by this plan)

**Spec reference:** `docs/superpowers/specs/2026-05-20-leveling-quests-design.md`

---

## Pre-flight: verification commands

These are the only verification commands this project supports. Most tasks use one or both. The project has no unit-test framework — verification is `bun run check` (lint + format + typecheck) plus smoke checks against the dev server.

| Command | Runs | Use for |
|---|---|---|
| `bun run typecheck` | TS typecheck across all packages | After any code/type change |
| `bun run check` | lint + format + typecheck | Pre-commit gate |
| `bun --cwd apps/api dev` | Start Worker locally (port 8787 default) | Smoke check API responses |
| `bun --cwd apps/app start` | Start Expo on app | Smoke check UI |
| `bun --cwd packages/db drizzle-kit push` | Apply Drizzle schema changes to DB | After Drizzle schema edits |
| `D1 CLI "$CLOUDFLARE_D1_DATABASE_ID" -f packages/db/d1/schema.sql` | Reset + reseed DB | After seed edits |

> **Note:** `reset.sql` resets the entire `app` schema and reseeds. If running it during execution, all other working state is lost; this is fine for hackathon iteration but be aware.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `packages/db/d1/schema.sql` | modify | Add `signatures` and `user_signatures` tables, revise `level_perks` seed (cap-5 numbers), expand `level_quest_sets` seed to all 10 levels with new ramp, replace `streak_reward_definitions` seed (days 3/7/14/30) |
| `packages/db/src/schema/index.ts` | modify | Add Drizzle definitions for `signatures` and `user_signatures` to mirror SQL |
| `packages/shared/src/quest.ts` | modify | Add `capacity_billboard` variant to `streakRewardSchema`; remove `xp_multiplier` variant |
| `packages/shared/src/signature.ts` | create | Zod schemas + types for `Signature`, `UserSignature`, `ListSignaturesResponse`, `EquipSignatureInput` |
| `packages/shared/src/index.ts` | modify | Re-export the new `signature` module |
| `apps/api/src/services/progression.ts` | modify | `getUserCapacities` adds streak-perk billboard slots; new `applyStreakMilestoneUnlocks` helper |
| `apps/api/src/services/streaks.ts` | create | `resetBrokenStreaks(db)` — reset `daily_streak` to 0 for users whose previous-day daily wasn't claimed |
| `apps/api/src/routes/quests.ts` | modify | Claim flow: zero XP for daily quests; call `applyStreakMilestoneUnlocks` on daily claim |
| `apps/api/src/routes/signatures.ts` | create | `GET /api/signatures`, `GET /api/users/me/signatures`, `PATCH /api/users/me/signature` |
| `apps/api/src/index.ts` | modify | Register signatures route; call `resetBrokenStreaks` in `scheduled()` |
| `apps/app/lib/api.ts` | modify | Add `fetchSignatures`, `fetchMySignatures`, `equipSignature` helpers |
| `apps/app/components/QuestCard.tsx` | modify | Render daily quest reward as "+1 streak" (no XP); level quest cards unchanged |
| `apps/app/components/NextMilestonePreview.tsx` | create | Shows next streak milestone (days remaining + reward preview) |
| `apps/app/app/(app)/quests.tsx` | modify | Wire `NextMilestonePreview` under the daily quest section; replace mock fetch with API call (optional, kept on mock for hackathon) |
| `apps/app/app/(app)/profile.tsx` | modify | Add signature picker (visible only when user has L4 unlocked); equip via API |
| `apps/app/lib/mockQuests.ts` | modify | Set `xpReward: 0` on the daily quest mock |

---

## Phase A — Schema & seed deltas

### Task 1: Revise `level_perks` seed to cap concurrent at 5

**Why:** The current seed has L2/L5/L8 each adding +1 concurrent (reaching 6) and L10 jumping to 10. Per spec §5, level path caps at 5 (L2 +1, L8 +1) and the L10 jump is removed.

**Files:**
- Modify: `packages/db/d1/schema.sql:420-438`

- [ ] **Step 1: Replace the `level_perks` insert block**

Open `packages/db/d1/schema.sql` and locate the `insert into app.level_perks` block (around lines 420-438). Replace the entire block with:

```sql
insert into app.level_perks (id, level, perk_id, numeric_value, metadata)
values
  -- L1 base
  ('00000000-0000-4000-8000-000000000900', 1, '00000000-0000-4000-8000-000000000800', 3, null),
  ('00000000-0000-4000-8000-000000000901', 1, '00000000-0000-4000-8000-000000000801', 4, null),
  ('00000000-0000-4000-8000-000000000902', 1, '00000000-0000-4000-8000-000000000802', 10, null),
  -- L2: +1 concurrent, +1 per day
  ('00000000-0000-4000-8000-000000000903', 2, '00000000-0000-4000-8000-000000000800', 4, null),
  ('00000000-0000-4000-8000-000000000904', 2, '00000000-0000-4000-8000-000000000801', 5, null),
  -- L3: +2 sticker slots
  ('00000000-0000-4000-8000-000000000905', 3, '00000000-0000-4000-8000-000000000802', 12, null),
  -- L4: signature display feature unlock
  ('00000000-0000-4000-8000-000000000906', 4, '00000000-0000-4000-8000-000000000803', null, '{"enabled":true}'::jsonb),
  -- L5: +1 per day (no concurrent bump per revised spec)
  ('00000000-0000-4000-8000-000000000908', 5, '00000000-0000-4000-8000-000000000801', 6, null),
  -- L6: note border flair
  ('00000000-0000-4000-8000-000000000909', 6, '00000000-0000-4000-8000-000000000804', null, '{"enabled":true}'::jsonb),
  -- L7: +2 sticker slots
  ('00000000-0000-4000-8000-00000000090a', 7, '00000000-0000-4000-8000-000000000802', 14, null),
  -- L8: +1 concurrent, +1 per day (final concurrent bump from leveling)
  ('00000000-0000-4000-8000-00000000090b', 8, '00000000-0000-4000-8000-000000000800', 5, null),
  ('00000000-0000-4000-8000-00000000090c', 8, '00000000-0000-4000-8000-000000000801', 7, null),
  -- L9: palette expansion
  ('00000000-0000-4000-8000-00000000090d', 9, '00000000-0000-4000-8000-000000000805', null, '{"palette":"extended"}'::jsonb),
  -- L10: +1 per day, +2 sticker slots (no concurrent bump — capped at 5 from L8)
  ('00000000-0000-4000-8000-00000000090f', 10, '00000000-0000-4000-8000-000000000801', 8, null),
  ('00000000-0000-4000-8000-000000000910', 10, '00000000-0000-4000-8000-000000000802', 16, null);
```

Note: row id `…907` (was L5 concurrent +1) and `…90e` (was L10 concurrent 10) are intentionally removed.

- [ ] **Step 2: Sanity check the math by reading the file back**

Grep the file for the new value cap:

```bash
grep "level_perks" packages/db/d1/schema.sql | head -20
```

Confirm L8 concurrent shows `5` and L10 has no concurrent row.

- [ ] **Step 3: Commit**

```bash
git add packages/db/d1/schema.sql
git commit -m "db: cap level-perk concurrent billboards at 5"
```

---

### Task 2: Expand `level_quest_sets` seed to all 10 levels with new ramp

**Why:** Current seed covers L1–L3 only. Per spec §3.1, tier sizes are 1-2-2-3-3-3-4-4-5-5 (total 32 quests). Per spec §3.2, no template repeats within a tier, and target values scale with tier.

**Files:**
- Modify: `packages/db/d1/schema.sql:388-394`

Template UUID reference (from existing seed, lines 372-378):
- `visit_pois` → `00000000-0000-4000-8000-000000000301`
- `leave_billboards` → `00000000-0000-4000-8000-000000000302`
- `place_stickers` → `00000000-0000-4000-8000-000000000303`
- `receive_replies` → `00000000-0000-4000-8000-000000000304`
- `save_stickers` → `00000000-0000-4000-8000-000000000305`

- [ ] **Step 1: Bump `max_target` on quest templates so seeded values fit**

In the same file, locate `insert into app.quest_templates` (lines 372-378). The existing template max_target values are too small for L10 targets. Replace the block with:

```sql
insert into app.quest_templates (id, key, trigger_type, title_template, description_template, min_target, max_target, xp_reward)
values
  ('00000000-0000-4000-8000-000000000301', 'visit_pois', 'visit_pois', 'Visit {target} new POIs', 'Discover {target} campus landmarks you have not visited before.', 1, 15, 50),
  ('00000000-0000-4000-8000-000000000302', 'leave_billboards', 'leave_billboards', 'Leave {target} billboards', 'Post {target} notes around campus.', 1, 12, 50),
  ('00000000-0000-4000-8000-000000000303', 'place_stickers', 'place_stickers', 'Place {target} stickers', 'Reply to billboards with {target} sticker placements.', 1, 12, 50),
  ('00000000-0000-4000-8000-000000000304', 'receive_replies', 'receive_replies', 'Receive {target} replies', 'Have other students reply to your billboards {target} times.', 1, 10, 75),
  ('00000000-0000-4000-8000-000000000305', 'save_stickers', 'save_stickers', 'Save {target} stickers', 'Save {target} stickers or sticky notes to your collection.', 1, 12, 40);
```

- [ ] **Step 2: Replace the `level_quest_sets` insert with full 10-level seed**

Locate `insert into app.level_quest_sets` (lines 388-394) and replace with:

```sql
insert into app.level_quest_sets (id, level, template_id, target_count, xp_reward, sort_order)
values
  -- L1 (1 quest)
  ('00000000-0000-4000-8000-000000000501', 1, '00000000-0000-4000-8000-000000000301', 3,  60, 1),

  -- L2 (2 quests)
  ('00000000-0000-4000-8000-000000000502', 2, '00000000-0000-4000-8000-000000000302', 2,  40, 1),
  ('00000000-0000-4000-8000-000000000503', 2, '00000000-0000-4000-8000-000000000303', 2,  40, 2),

  -- L3 (2 quests)
  ('00000000-0000-4000-8000-000000000504', 3, '00000000-0000-4000-8000-000000000301', 4,  80, 1),
  ('00000000-0000-4000-8000-000000000505', 3, '00000000-0000-4000-8000-000000000305', 3,  60, 2),

  -- L4 (3 quests)
  ('00000000-0000-4000-8000-000000000506', 4, '00000000-0000-4000-8000-000000000302', 3,  60, 1),
  ('00000000-0000-4000-8000-000000000507', 4, '00000000-0000-4000-8000-000000000303', 3,  60, 2),
  ('00000000-0000-4000-8000-000000000508', 4, '00000000-0000-4000-8000-000000000304', 2,  90, 3),

  -- L5 (3 quests)
  ('00000000-0000-4000-8000-000000000509', 5, '00000000-0000-4000-8000-000000000301', 6, 120, 1),
  ('00000000-0000-4000-8000-00000000050a', 5, '00000000-0000-4000-8000-000000000302', 4,  80, 2),
  ('00000000-0000-4000-8000-00000000050b', 5, '00000000-0000-4000-8000-000000000305', 4,  80, 3),

  -- L6 (3 quests)
  ('00000000-0000-4000-8000-00000000050c', 6, '00000000-0000-4000-8000-000000000303', 5, 100, 1),
  ('00000000-0000-4000-8000-00000000050d', 6, '00000000-0000-4000-8000-000000000304', 3, 120, 2),
  ('00000000-0000-4000-8000-00000000050e', 6, '00000000-0000-4000-8000-000000000305', 5, 100, 3),

  -- L7 (4 quests)
  ('00000000-0000-4000-8000-00000000050f', 7, '00000000-0000-4000-8000-000000000301', 7, 140, 1),
  ('00000000-0000-4000-8000-000000000510', 7, '00000000-0000-4000-8000-000000000302', 5, 100, 2),
  ('00000000-0000-4000-8000-000000000511', 7, '00000000-0000-4000-8000-000000000303', 6, 120, 3),
  ('00000000-0000-4000-8000-000000000512', 7, '00000000-0000-4000-8000-000000000304', 4, 160, 4),

  -- L8 (4 quests)
  ('00000000-0000-4000-8000-000000000513', 8, '00000000-0000-4000-8000-000000000302', 6, 120, 1),
  ('00000000-0000-4000-8000-000000000514', 8, '00000000-0000-4000-8000-000000000303', 7, 140, 2),
  ('00000000-0000-4000-8000-000000000515', 8, '00000000-0000-4000-8000-000000000304', 5, 200, 3),
  ('00000000-0000-4000-8000-000000000516', 8, '00000000-0000-4000-8000-000000000305', 6, 120, 4),

  -- L9 (5 quests — all 5 templates)
  ('00000000-0000-4000-8000-000000000517', 9, '00000000-0000-4000-8000-000000000301', 9, 180, 1),
  ('00000000-0000-4000-8000-000000000518', 9, '00000000-0000-4000-8000-000000000302', 7, 140, 2),
  ('00000000-0000-4000-8000-000000000519', 9, '00000000-0000-4000-8000-000000000303', 8, 160, 3),
  ('00000000-0000-4000-8000-00000000051a', 9, '00000000-0000-4000-8000-000000000304', 6, 240, 4),
  ('00000000-0000-4000-8000-00000000051b', 9, '00000000-0000-4000-8000-000000000305', 8, 160, 5),

  -- L10 (5 quests — all 5 templates, highest targets)
  ('00000000-0000-4000-8000-00000000051c', 10, '00000000-0000-4000-8000-000000000301', 11, 220, 1),
  ('00000000-0000-4000-8000-00000000051d', 10, '00000000-0000-4000-8000-000000000302', 8,  160, 2),
  ('00000000-0000-4000-8000-00000000051e', 10, '00000000-0000-4000-8000-000000000303', 10, 200, 3),
  ('00000000-0000-4000-8000-00000000051f', 10, '00000000-0000-4000-8000-000000000304', 7,  280, 4),
  ('00000000-0000-4000-8000-000000000520', 10, '00000000-0000-4000-8000-000000000305', 9,  180, 5);
```

- [ ] **Step 2.5: Verify the quest count math**

Open the new block and count rows by `level`. Expected counts: L1=1, L2=2, L3=2, L4=3, L5=3, L6=3, L7=4, L8=4, L9=5, L10=5. Total = 32.

```bash
grep -E "', [0-9]+, '00000000-0000-4000-8000-000000000(301|302|303|304|305)'," packages/db/d1/schema.sql | wc -l
```

Expected: at least 32 (some rows may match if `select random` blocks include similar substring — eyeball the actual block to confirm).

- [ ] **Step 3: Commit**

```bash
git add packages/db/d1/schema.sql
git commit -m "db: seed level quest sets for all 10 levels (32 quests, 1-2-2-3-3-3-4-4-5-5)"
```

---

### Task 3: Replace `streak_reward_definitions` seed with new milestone schedule

**Why:** Spec §4.5: streak milestones at days 3 / 7 / 14 / 30. Days 3, 7, 30 grant a signature; day 14 grants `+1 concurrent billboard`. The current seed has different days and uses `xp_multiplier` (which the spec drops).

**Files:**
- Modify: `packages/db/d1/schema.sql:440-443`

- [ ] **Step 1: Replace the `streak_reward_definitions` insert**

Locate `insert into app.streak_reward_definitions` (lines 440-443). Replace with:

```sql
insert into app.streak_reward_definitions (id, streak_days, name, reward)
values
  ('00000000-0000-4000-8000-000000000a01', 3,  'Three day spark',
   '{"rewards":[{"type":"signature","signatureKey":"signature_a"}]}'::jsonb),
  ('00000000-0000-4000-8000-000000000a02', 7,  'Week one trail',
   '{"rewards":[{"type":"signature","signatureKey":"signature_b"}]}'::jsonb),
  ('00000000-0000-4000-8000-000000000a03', 14, 'Fortnight forager',
   '{"rewards":[{"type":"capacity_billboard","amount":1}]}'::jsonb),
  ('00000000-0000-4000-8000-000000000a04', 30, 'Month-long marker',
   '{"rewards":[{"type":"signature","signatureKey":"signature_c"}]}'::jsonb);
```

- [ ] **Step 2: Commit**

```bash
git add packages/db/d1/schema.sql
git commit -m "db: seed streak milestones at days 3/7/14/30"
```

---

### Task 4: Add `signatures` and `user_signatures` tables (SQL)

**Why:** Spec §7.2 — earned signatures need to be stored and equipped. `signatures` is the seed catalog; `user_signatures` is the junction with `is_equipped` (at most one true per user).

**Files:**
- Modify: `packages/db/d1/schema.sql` (append new tables before the `create index` block around line 326)

- [ ] **Step 1: Append the new tables**

In `packages/db/d1/schema.sql`, just BEFORE the `create index pois_active_campus_idx` line (around line 326), insert:

```sql
create table app.signatures (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  asset_base64 text not null,
  streak_day_required integer not null check (streak_day_required > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table app.user_signatures (
  user_id uuid not null references app.users(id) on delete cascade,
  signature_id uuid not null references app.signatures(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  is_equipped boolean not null default false,
  primary key (user_id, signature_id)
);

create unique index user_signatures_one_equipped_idx
  on app.user_signatures (user_id) where is_equipped;
```

- [ ] **Step 2: Append seed signatures at end of file**

At the very END of `packages/db/d1/schema.sql`, append:

```sql
insert into app.signatures (id, key, name, asset_base64, streak_day_required)
values
  ('00000000-0000-4000-8000-000000000b01', 'signature_a', 'Sunrise Mark',
   'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
   3),
  ('00000000-0000-4000-8000-000000000b02', 'signature_b', 'Pixel Bloom',
   'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
   7),
  ('00000000-0000-4000-8000-000000000b03', 'signature_c', 'Prestige Cipher',
   'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
   30);
```

The base64 above is a 1×1 transparent PNG placeholder. The team will replace `asset_base64` values with real pixel art before launch.

- [ ] **Step 3: Commit**

```bash
git add packages/db/d1/schema.sql
git commit -m "db: add signatures and user_signatures tables"
```

---

### Task 5: Mirror the new tables in Drizzle schema

**Why:** Drizzle queries depend on the schema being declared. Without these, any select against `signatures` is a runtime error in dev.

**Files:**
- Modify: `packages/db/src/schema/index.ts` (append before `export const reports`)

- [ ] **Step 1: Append Drizzle table definitions**

At the END of `packages/db/src/schema/index.ts` (after `streakRewardDefinitions`, before `reports`), insert:

```ts
export const signatures = appSchema.table(
  "signatures",
  {
    id: uuidPrimaryKey(),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    assetBase64: text("asset_base64").notNull(),
    streakDayRequired: integer("streak_day_required").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt,
  },
  (table) => [check("signatures_streak_day_check", sql`${table.streakDayRequired} > 0`)],
);

export const userSignatures = appSchema.table(
  "user_signatures",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    signatureId: uuid("signature_id")
      .notNull()
      .references(() => signatures.id, { onDelete: "cascade" }),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
    isEquipped: boolean("is_equipped").notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.signatureId] }),
    uniqueIndex("user_signatures_one_equipped_idx")
      .on(table.userId)
      .where(sql`${table.isEquipped}`),
  ],
);
```

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck:db
```

Expected: PASS (no errors). If imports fail (`primaryKey`, `uniqueIndex`, etc.), they're already imported at the top of the file (lines 1-17) — no action needed.

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/schema/index.ts
git commit -m "db: drizzle schema for signatures and user_signatures"
```

---

### Task 6: Apply schema + reseed the database

**Why:** All schema changes so far have been to source files. They need to be applied to the running database before any backend code that references them will work.

- [ ] **Step 1: Reset and reseed**

Run (assumes `CLOUDFLARE_D1_DATABASE_ID` env var is set):

```bash
D1 CLI "$CLOUDFLARE_D1_DATABASE_ID" -f packages/db/d1/schema.sql
```

Expected output: a series of `DROP`, `CREATE`, `INSERT` lines. No `ERROR` lines.

- [ ] **Step 2: Sanity check via D1 CLI**

```bash
D1 CLI "$CLOUDFLARE_D1_DATABASE_ID" -c "select level, count(*) from app.level_quest_sets group by level order by level;"
```

Expected: 10 rows with counts 1, 2, 2, 3, 3, 3, 4, 4, 5, 5.

```bash
D1 CLI "$CLOUDFLARE_D1_DATABASE_ID" -c "select streak_days, name from app.streak_reward_definitions order by streak_days;"
```

Expected: 4 rows for days 3, 7, 14, 30.

```bash
D1 CLI "$CLOUDFLARE_D1_DATABASE_ID" -c "select count(*) from app.signatures;"
```

Expected: 3.

- [ ] **Step 3: No commit needed** — this task only mutates the running DB.

---

## Phase B — Shared types

### Task 7: Add `capacity_billboard` and `signature` variants to streak reward schema

**Why:** Spec §4.5: streak rewards are signatures and capacity perks. Current `streakRewardSchema` (in `quest.ts`) supports `xp_multiplier` and `cosmetic` — both wrong shape for the new design.

**Files:**
- Modify: `packages/shared/src/quest.ts:62-75`

- [ ] **Step 1: Replace the streak reward schemas**

Locate the `streakRewardSchema` block (lines 62-75). Replace with:

```ts
export const streakRewardSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("signature"),
    signatureKey: z.string().min(1),
  }),
  z.object({
    type: z.literal("capacity_billboard"),
    amount: z.number().int().positive(),
  }),
]);

export const streakRewardPayloadSchema = z.object({
  rewards: z.array(streakRewardSchema).min(1),
});
```

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck
```

Expected: PASS. If any code reads `xp_multiplier` or `cosmetic` from streak rewards, it'll fail here — none should exist currently (seed data is the only consumer and we just replaced it).

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/quest.ts
git commit -m "shared: streak rewards are signatures or capacity bumps"
```

---

### Task 8: Add signature schemas

**Why:** Spec §7.2: `signatures` and `user_signatures` need wire types so the API can return them and the app can render them.

**Files:**
- Create: `packages/shared/src/signature.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create the signature schema file**

Write `packages/shared/src/signature.ts`:

```ts
import { z } from "zod";

import { idSchema, isoDateTimeSchema } from "./common";

export const signatureSchema = z.object({
  id: idSchema,
  key: z.string().min(1),
  name: z.string().min(1),
  assetBase64: z.string().min(1),
  streakDayRequired: z.number().int().positive(),
  active: z.boolean(),
});

export const userSignatureSchema = z.object({
  signature: signatureSchema,
  unlockedAt: isoDateTimeSchema,
  isEquipped: z.boolean(),
});

export const listSignaturesResponseSchema = z.object({
  catalog: z.array(signatureSchema),
});

export const listMySignaturesResponseSchema = z.object({
  unlocked: z.array(userSignatureSchema),
  signatureFeatureUnlocked: z.boolean(),
});

export const equipSignatureInputSchema = z.object({
  signatureId: idSchema.nullable(),
});

export const equipSignatureResponseSchema = z.object({
  equippedSignatureId: idSchema.nullable(),
});

export type Signature = z.infer<typeof signatureSchema>;
export type UserSignature = z.infer<typeof userSignatureSchema>;
export type ListSignaturesResponse = z.infer<typeof listSignaturesResponseSchema>;
export type ListMySignaturesResponse = z.infer<typeof listMySignaturesResponseSchema>;
export type EquipSignatureInput = z.infer<typeof equipSignatureInputSchema>;
export type EquipSignatureResponse = z.infer<typeof equipSignatureResponseSchema>;
```

- [ ] **Step 2: Re-export from package index**

Edit `packages/shared/src/index.ts` and add `export * from "./signature";` (alphabetised between `report` and `sticker`):

```ts
export * from "./billboard";
export * from "./common";
export * from "./perk";
export * from "./poi";
export * from "./quest";
export * from "./report";
export * from "./signature";
export * from "./sticker";
export * from "./user";
```

- [ ] **Step 3: Typecheck**

```bash
bun run typecheck:shared
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/signature.ts packages/shared/src/index.ts
git commit -m "shared: signature schemas (catalog, user, equip)"
```

---

## Phase C — Backend services & routes

### Task 9: Zero out daily quest XP in the claim flow

**Why:** Spec §2 and §4.2: daily quests award no XP. Current claim handler (`apps/api/src/routes/quests.ts`) reads `xp_reward` from `daily_quest_pool` and adds it to `users.xp`. We need to bypass XP entirely for `daily_quest` source — the streak bump on the same UPDATE already exists and is correct.

**Files:**
- Modify: `apps/api/src/routes/quests.ts:53-69` and `:104-132`

- [ ] **Step 1: Stop sourcing XP from `daily_quest_pool` in the claim SELECT**

In `apps/api/src/routes/quests.ts`, find the ClaimRow SELECT (lines 53-69). Replace the `xpReward` coalesce so daily quests yield 0:

```ts
const rows = await db.execute<ClaimRow>(sql`
  select
    user_quest_progress.source,
    user_quest_progress.completed_at as "completedAt",
    user_quest_progress.claimed_at as "claimedAt",
    case
      when user_quest_progress.source = 'level_quest' then level_quest_sets.xp_reward
      else 0
    end as "xpReward"
  from app.user_quest_progress
  left join app.level_quest_sets
    on user_quest_progress.source = 'level_quest'
    and user_quest_progress.source_id = level_quest_sets.id
  where user_quest_progress.id = ${id} and user_quest_progress.user_id = ${authUser.id}
`);
```

Note: the `daily_quest_assignments` / `daily_quest_pool` joins are removed since they're no longer needed for the XP coalesce.

- [ ] **Step 2: Guard the `users.xp` update so daily quests don't add XP**

In the same file, find the `update app.users` statement (lines 109-132). Wrap the `xp` increment in a `case`:

```ts
await db.execute(sql`
  update app.users
  set
    xp = case when ${quest.source} = 'level_quest' then xp + ${quest.xpReward} else xp end,
    last_daily_claimed_on = case
      when ${quest.source} = 'daily_quest' then (timezone('Australia/Sydney', now()))::date
      else last_daily_claimed_on
    end,
    daily_streak = case
      when ${quest.source} = 'daily_quest'
        and (
          last_daily_claimed_on is null
          or last_daily_claimed_on < (timezone('Australia/Sydney', now()))::date
        )
      then daily_streak + 1
      else daily_streak
    end,
    streak_updated_on = case
      when ${quest.source} = 'daily_quest' then (timezone('Australia/Sydney', now()))::date
      else streak_updated_on
    end,
    updated_at = now()
  where id = ${authUser.id}
`);
```

- [ ] **Step 3: Typecheck**

```bash
bun run typecheck:api
```

Expected: PASS.

- [ ] **Step 4: Smoke check**

Start the API:

```bash
bun --cwd apps/api dev
```

In a separate shell, claim a daily quest using the demo bearer token (set `USER_ID` and `QUEST_ID` from `D1 CLI` queries):

```bash
curl -s -X POST -H "Authorization: Bearer dev" -H "Content-Type: application/json" \
  -d '{}' \
  http://localhost:8787/api/quests/$QUEST_ID/claim
```

Expected response: `xpAwarded: 0` for a daily quest claim; `levelBefore === levelAfter`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/quests.ts
git commit -m "api: daily quests no longer award XP"
```

---

### Task 10: Streak milestone unlock helper

**Why:** Spec §4.5: claiming a daily quest can cross a streak milestone (day 3/7/14/30). When that happens, insert rows into `user_perk_unlocks` (for capacity rewards) or `user_signatures` (for signature rewards).

**Files:**
- Modify: `apps/api/src/services/progression.ts` (append `applyStreakMilestoneUnlocks`)

- [ ] **Step 1: Append the helper to `progression.ts`**

At the END of `apps/api/src/services/progression.ts`, append:

```ts
type StreakRewardJson = {
  rewards: Array<
    | { type: "signature"; signatureKey: string }
    | { type: "capacity_billboard"; amount: number }
  >;
};

export async function applyStreakMilestoneUnlocks(
  db: Database,
  userId: string,
  currentStreak: number,
) {
  const rewardRows = await db.execute<{ streakDays: number; reward: StreakRewardJson }>(sql`
    select streak_days as "streakDays", reward
    from app.streak_reward_definitions
    where active and streak_days = ${currentStreak}
  `);

  for (const row of rewardRows) {
    for (const reward of row.reward.rewards) {
      if (reward.type === "signature") {
        await db.execute(sql`
          insert into app.user_signatures (user_id, signature_id, is_equipped)
          select ${userId}, signatures.id, false
          from app.signatures
          where signatures.key = ${reward.signatureKey}
          on conflict (user_id, signature_id) do nothing
        `);
      } else if (reward.type === "capacity_billboard") {
        // Stored as a "virtual" level perk row keyed at level=0 with metadata
        // tagging it as streak-derived. The level_perks unique constraint on
        // (level, perk_id) means there's exactly one canonical streak-billboard
        // row in the table, and every user who unlocks the milestone links to
        // it via user_perk_unlocks. getUserCapacities sums these (Task 11).
        await db.execute(sql`
          insert into app.level_perks (level, perk_id, numeric_value, metadata)
          select 0, id, ${reward.amount},
            jsonb_build_object('source', 'streak', 'streakDay', ${row.streakDays})
          from app.perk_definitions
          where key = 'max_concurrent_billboards'
          on conflict (level, perk_id) do nothing
        `);
        await db.execute(sql`
          insert into app.user_perk_unlocks (user_id, level_perk_id, source_level)
          select ${userId}, level_perks.id, 0
          from app.level_perks
          join app.perk_definitions on perk_definitions.id = level_perks.perk_id
          where level_perks.level = 0
            and perk_definitions.key = 'max_concurrent_billboards'
          on conflict (user_id, level_perk_id) do nothing
        `);
      }
    }
  }
}
```

> **Note for the engineer:** the `capacity_billboard` reward reuses the existing `level_perks` table with `level = 0` as a marker for "streak-derived." This keeps `getUserCapacities` unchanged in shape (it sums over `level_perks`); only the WHERE filter needs to allow `level = 0` for streak-derived rows. See Task 11.

- [ ] **Step 2: Allow level=0 rows in the existing CHECK constraint**

The current `level_perks` table has `check (level >= 1)` which would block streak-source rows (level=0). Open `packages/db/d1/schema.sql` and find the `create table app.level_perks` block (around lines 262-270). Change `check (level >= 1)` to `check (level >= 0)`. Also update the Drizzle definition: in `packages/db/src/schema/index.ts:518`, change `sql\`${table.level} >= 1\`` to `sql\`${table.level} >= 0\``.

- [ ] **Step 3: Re-apply schema**

```bash
D1 CLI "$CLOUDFLARE_D1_DATABASE_ID" -f packages/db/d1/schema.sql
```

(This re-runs all the seed data too — fine.)

- [ ] **Step 4: Typecheck**

```bash
bun run typecheck:api
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/progression.ts packages/db/d1/schema.sql packages/db/src/schema/index.ts
git commit -m "api: applyStreakMilestoneUnlocks helper + allow level=0 perks"
```

---

### Task 11: Call `applyStreakMilestoneUnlocks` on daily quest claim, and include its perks in capacity computation

**Why:** Streak milestones only matter if they fire on claim AND are reflected in capacity reads.

**Files:**
- Modify: `apps/api/src/routes/quests.ts` (after the `users` update, before `maybeLevelUp`)
- Modify: `apps/api/src/services/progression.ts:118-148` (capacity SELECT)

- [ ] **Step 1: Call the helper on daily quest claim**

In `apps/api/src/routes/quests.ts`, after the `users` UPDATE statement (currently around line 132) and before `if (quest.source === "level_quest") { await maybeLevelUp(...) }`, add:

```ts
import { applyStreakMilestoneUnlocks, getUserCapacities } from "../services/progression";
```

(Add `applyStreakMilestoneUnlocks` to the existing import line if `getUserCapacities` is already imported, otherwise add the new import at the top.)

Then in the route handler body, after the `update app.users` execute and before the level-up branch:

```ts
if (quest.source === "daily_quest") {
  const streakRows = await db.execute<{ dailyStreak: number }>(sql`
    select daily_streak as "dailyStreak" from app.users where id = ${authUser.id}
  `);
  const streak = streakRows[0]?.dailyStreak ?? 0;
  await applyStreakMilestoneUnlocks(db, authUser.id, streak);
}
```

- [ ] **Step 2: Adjust `getUserCapacities` to include streak (level=0) perks**

In `apps/api/src/services/progression.ts`, the current `getUserCapacities` filter is:

```sql
where level_perks.level <= user_level.level
```

This already includes `level = 0` rows naturally (since `0 <= any user level`), so streak-derived perks WILL be summed. BUT the current SELECT uses `max(level_perks.numeric_value)` per perk — that takes the highest single row, not the sum. With multiple rows that have different `level` (e.g. L2 = 4, L8 = 5, streak = 1), `max` returns 5, not 4+5+1=10.

Change the aggregation to a proper **delta-sum**: the per-level rows in `level_perks` are *absolute totals* (L2 says concurrent=4 meaning "at L2 you have 4 total"), not deltas. To get the user's effective cap, we need: the **max from leveling** (highest level <= user_level) **plus** the **sum of streak deltas** (where level = 0).

Replace `getUserCapacities` body with:

```ts
export async function getUserCapacities(db: Database, userId: string) {
  const rows = await db.execute<CapacityRow>(sql`
    with user_level as (
      select level
      from app.users
      where id = ${userId}
    ),
    level_caps as (
      select
        perk_definitions.key,
        max(level_perks.numeric_value) as cap
      from app.level_perks
      join app.perk_definitions on perk_definitions.id = level_perks.perk_id
      cross join user_level
      where
        level_perks.level >= 1
        and level_perks.level <= user_level.level
      group by perk_definitions.key
    ),
    streak_deltas as (
      select
        perk_definitions.key,
        coalesce(sum(level_perks.numeric_value), 0) as delta
      from app.level_perks
      join app.perk_definitions on perk_definitions.id = level_perks.perk_id
      join app.user_perk_unlocks
        on user_perk_unlocks.level_perk_id = level_perks.id
        and user_perk_unlocks.user_id = ${userId}
      where level_perks.level = 0
      group by perk_definitions.key
    )
    select
      coalesce(
        (select cap from level_caps where key = 'max_concurrent_billboards'),
        0
      ) + coalesce(
        (select delta from streak_deltas where key = 'max_concurrent_billboards'),
        0
      ) as "maxConcurrentBillboards",
      coalesce(
        (select cap from level_caps where key = 'daily_billboard_limit'),
        0
      ) + coalesce(
        (select delta from streak_deltas where key = 'daily_billboard_limit'),
        0
      ) as "dailyBillboardLimit",
      coalesce(
        (select cap from level_caps where key = 'sticker_slots'),
        0
      ) + coalesce(
        (select delta from streak_deltas where key = 'sticker_slots'),
        0
      ) as "stickerSlots"
  `);

  const capacities = rows[0];

  return {
    dailyBillboardLimit: capacities?.dailyBillboardLimit ?? 4,
    maxConcurrentBillboards: capacities?.maxConcurrentBillboards ?? 3,
    stickerSlots: capacities?.stickerSlots ?? 10,
  };
}
```

- [ ] **Step 3: Typecheck**

```bash
bun run typecheck:api
```

Expected: PASS.

- [ ] **Step 4: Smoke check**

With the dev DB at a fresh state (run `D1 CLI … -f reset.sql` if needed), hit `/api/users/me/progress` for the demo user and confirm `capacities` reflects the base L1 values (concurrent=3, daily=4, sticker=10). Then `UPDATE app.users SET daily_streak = 14, level = 8 WHERE id = '00000000-0000-4000-8000-000000000002';`, call `applyStreakMilestoneUnlocks` (e.g. via curl after claiming a daily — or in D1 CLI: `INSERT INTO app.level_perks (level, perk_id, numeric_value, metadata) SELECT 0, id, 1, '{"source":"streak"}'::jsonb FROM app.perk_definitions WHERE key='max_concurrent_billboards';` then `INSERT INTO app.user_perk_unlocks(user_id, level_perk_id, source_level) SELECT '...', id, 0 FROM app.level_perks WHERE level=0;`). Hit `/api/users/me/progress` again: `maxConcurrentBillboards` should be 6 (L8=5 + streak=1).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/quests.ts apps/api/src/services/progression.ts
git commit -m "api: streak milestones unlock on daily claim and contribute to capacity"
```

---

### Task 12: Streak-break worker — reset broken streaks once per Sydney day

**Why:** Spec §4.4. A user who didn't claim yesterday's daily by midnight Sydney should be reset to `daily_streak = 0`.

**Files:**
- Create: `apps/api/src/services/streaks.ts`
- Modify: `apps/api/src/index.ts:63-72` (scheduled handler)

- [ ] **Step 1: Create the streaks service**

Write `apps/api/src/services/streaks.ts`:

```ts
import { sql } from "drizzle-orm";

import type { getDb } from "../db";

type Database = ReturnType<typeof getDb>;

export async function resetBrokenStreaks(db: Database) {
  await db.execute(sql`
    update app.users
    set daily_streak = 0, updated_at = now()
    where
      daily_streak > 0
      and (
        last_daily_claimed_on is null
        or last_daily_claimed_on < (timezone('Australia/Sydney', now()))::date - interval '1 day'
      )
  `);
}
```

The condition reads: "if a user has a positive streak AND they haven't claimed a daily on yesterday OR today (Sydney calendar), break their streak." Today's claims are protected because `last_daily_claimed_on = today` satisfies the inequality.

- [ ] **Step 2: Wire it into the scheduled handler**

Open `apps/api/src/index.ts`. The current scheduled handler (lines 63-72) calls `ensureDailyRotations` and `expireBillboards`. Add the import and the call:

```ts
import { resetBrokenStreaks } from "./services/streaks";
```

In the `scheduled` function body, add `await resetBrokenStreaks(db);` after `await expireBillboards(db);`:

```ts
async scheduled(_event: ScheduledEvent, env: Env) {
  const db = getDb(env);

  await ensureDailyRotations(db);
  await expireBillboards(db);
  await resetBrokenStreaks(db);

  if (isSydneyReminderWindow()) {
    await sendDailyQuestReminder(env, db);
  }
},
```

- [ ] **Step 3: Typecheck**

```bash
bun run typecheck:api
```

Expected: PASS.

- [ ] **Step 4: Smoke check (manual)**

```bash
D1 CLI "$CLOUDFLARE_D1_DATABASE_ID" -c "update app.users set daily_streak = 7, last_daily_claimed_on = (current_date - 3) where id = '00000000-0000-4000-8000-000000000002';"
```

Then invoke the function via REPL or temporarily expose a debug route to call `resetBrokenStreaks`. The simplest smoke test:

```bash
D1 CLI "$CLOUDFLARE_D1_DATABASE_ID" -c "
  update app.users
  set daily_streak = 0
  where
    daily_streak > 0
    and (last_daily_claimed_on is null or last_daily_claimed_on < (timezone('Australia/Sydney', now()))::date - interval '1 day');
  select daily_streak from app.users where id = '00000000-0000-4000-8000-000000000002';
"
```

Expected: `daily_streak = 0`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/streaks.ts apps/api/src/index.ts
git commit -m "api: streak-break worker resets broken streaks"
```

---

### Task 13: Signature routes — list catalog, list mine, equip

**Why:** Spec §6 (UI surfaces) and §7.2: app needs to fetch the catalog, list the user's unlocked signatures, and switch which one is equipped. The `is_equipped` partial unique index already enforces at-most-one-equipped.

**Files:**
- Create: `apps/api/src/routes/signatures.ts`
- Modify: `apps/api/src/index.ts:7-16` and `:42-47`

- [ ] **Step 1: Create the signature route module**

Write `apps/api/src/routes/signatures.ts`:

```ts
import {
  equipSignatureInputSchema,
  equipSignatureResponseSchema,
  listMySignaturesResponseSchema,
  listSignaturesResponseSchema,
} from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { sql } from "drizzle-orm";
import { Hono } from "hono";

import { getDb } from "../db";
import { getAuthUser, requireAuth } from "../middleware/auth";
import { isoDateTime } from "../serialize";
import type { AppBindings } from "../types";

type CatalogRow = {
  id: string;
  key: string;
  name: string;
  assetBase64: string;
  streakDayRequired: number;
  active: boolean;
};

type MineRow = CatalogRow & {
  unlockedAt: Date | string;
  isEquipped: boolean;
};

const SIGNATURE_FEATURE_PERK_KEY = "note_signature";

export const signaturesRoute = new Hono<AppBindings>();

signaturesRoute.get("/signatures", async (c) => {
  const db = getDb(c.env);
  const rows = await db.execute<CatalogRow>(sql`
    select
      id,
      key,
      name,
      asset_base64 as "assetBase64",
      streak_day_required as "streakDayRequired",
      active
    from app.signatures
    where active
    order by streak_day_required
  `);

  return c.json(
    listSignaturesResponseSchema.parse({
      catalog: rows.map((row) => ({ ...row })),
    }),
  );
});

signaturesRoute.get("/users/me/signatures", requireAuth, async (c) => {
  const db = getDb(c.env);
  const authUser = getAuthUser(c);
  const [rows, featureRows] = await Promise.all([
    db.execute<MineRow>(sql`
      select
        signatures.id,
        signatures.key,
        signatures.name,
        signatures.asset_base64 as "assetBase64",
        signatures.streak_day_required as "streakDayRequired",
        signatures.active,
        user_signatures.unlocked_at as "unlockedAt",
        user_signatures.is_equipped as "isEquipped"
      from app.user_signatures
      join app.signatures on signatures.id = user_signatures.signature_id
      where user_signatures.user_id = ${authUser.id}
      order by signatures.streak_day_required
    `),
    db.execute<{ unlocked: boolean }>(sql`
      select exists (
        select 1
        from app.user_perk_unlocks
        join app.level_perks on level_perks.id = user_perk_unlocks.level_perk_id
        join app.perk_definitions on perk_definitions.id = level_perks.perk_id
        where user_perk_unlocks.user_id = ${authUser.id}
          and perk_definitions.key = ${SIGNATURE_FEATURE_PERK_KEY}
      ) as unlocked
    `),
  ]);

  return c.json(
    listMySignaturesResponseSchema.parse({
      signatureFeatureUnlocked: featureRows[0]?.unlocked ?? false,
      unlocked: rows.map((row) => ({
        isEquipped: row.isEquipped,
        signature: {
          active: row.active,
          assetBase64: row.assetBase64,
          id: row.id,
          key: row.key,
          name: row.name,
          streakDayRequired: row.streakDayRequired,
        },
        unlockedAt: isoDateTime(row.unlockedAt),
      })),
    }),
  );
});

signaturesRoute.patch(
  "/users/me/signature",
  requireAuth,
  zValidator("json", equipSignatureInputSchema),
  async (c) => {
    const db = getDb(c.env);
    const authUser = getAuthUser(c);
    const input = c.req.valid("json");

    await db.execute(sql`
      update app.user_signatures
      set is_equipped = false
      where user_id = ${authUser.id} and is_equipped
    `);

    if (input.signatureId !== null) {
      await db.execute(sql`
        update app.user_signatures
        set is_equipped = true
        where user_id = ${authUser.id} and signature_id = ${input.signatureId}
      `);
    }

    return c.json(
      equipSignatureResponseSchema.parse({
        equippedSignatureId: input.signatureId,
      }),
    );
  },
);
```

- [ ] **Step 2: Register the route in `index.ts`**

In `apps/api/src/index.ts`, import `signaturesRoute` and add it to the route list:

```ts
import { signaturesRoute } from "./routes/signatures";
```

```ts
app.route("/api", usersRoute);
app.route("/api", poisRoute);
app.route("/api", billboardsRoute);
app.route("/api", stickersRoute);
app.route("/api", questsRoute);
app.route("/api", reportsRoute);
app.route("/api", signaturesRoute);
```

- [ ] **Step 3: Typecheck**

```bash
bun run typecheck:api
```

Expected: PASS.

- [ ] **Step 4: Smoke check**

```bash
curl -s -H "Authorization: Bearer dev" http://localhost:8787/api/signatures | jq
```

Expected: `{ "catalog": [...3 items...] }`.

```bash
curl -s -H "Authorization: Bearer dev" http://localhost:8787/api/users/me/signatures | jq
```

Expected: `{ "signatureFeatureUnlocked": false, "unlocked": [] }` (the demo user is L1, no signatures unlocked yet).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/signatures.ts apps/api/src/index.ts
git commit -m "api: signature catalog + mine + equip endpoints"
```

---

## Phase D — Frontend

### Task 14: Render daily quest reward as "+1 streak"

**Why:** Spec §6: daily card should not display "+N XP". The QuestCard component reads `progress.quest.xpReward` and renders "+50 XP" — needs branching on `source`.

**Files:**
- Modify: `apps/app/components/QuestCard.tsx`

- [ ] **Step 1: Branch the reward label**

In `apps/app/components/QuestCard.tsx`, replace the `<Text style={styles.xp}>+{quest.xpReward} XP</Text>` line (around line 24) with a source-aware label. Update the destructuring on line 14 and the JSX:

```tsx
export function QuestCard({ progress, onClaim, isClaiming }: QuestCardProps) {
  const { quest, claimedAt, claimableAt, progressCount, targetCount, claimedXp } = progress;
  const claimed = Boolean(claimedAt);
  const claimable = Boolean(claimableAt) && !claimed;
  const isDaily = quest.source === "daily_quest";
  const rewardLabel = isDaily ? "+1 streak" : `+${quest.xpReward} XP`;
  const claimedLabel = isDaily
    ? "Claimed · streak +1"
    : `Claimed${claimedXp != null ? ` · +${claimedXp} XP` : ""}`;

  return (
    <Card>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={2}>
          {quest.title}
        </Text>
        <Text style={styles.xp}>{rewardLabel}</Text>
      </View>
      <Text style={styles.description}>{quest.description}</Text>
      <ProgressBar value={progressCount} max={targetCount} />
      <View style={styles.actionRow}>
        {claimed ? (
          <View style={styles.claimedPill}>
            <Text style={styles.claimedLabel}>{claimedLabel}</Text>
          </View>
        ) : claimable ? (
          <Pressable
            disabled={isClaiming}
            onPress={() => onClaim(progress.id)}
            style={({ pressed }) => [
              styles.claimButton,
              {
                opacity: isClaiming ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={styles.claimLabel}>{isClaiming ? "Claiming…" : "Claim"}</Text>
          </Pressable>
        ) : (
          <Text style={styles.pendingHint}>Keep exploring to make progress.</Text>
        )}
      </View>
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck:app
```

Expected: PASS.

- [ ] **Step 3: Smoke check (UI)**

Start the app:

```bash
bun --cwd apps/app start
```

Open the Quests tab. The daily quest card should now show `+1 streak` in the top-right (previously `+50 XP`).

- [ ] **Step 4: Commit**

```bash
git add apps/app/components/QuestCard.tsx
git commit -m "app: daily quest card shows '+1 streak' reward"
```

---

### Task 15: NextMilestonePreview component

**Why:** Spec §6: under the daily quest section, show the next streak unlock so the user knows what they're working toward.

**Files:**
- Create: `apps/app/components/NextMilestonePreview.tsx`

- [ ] **Step 1: Create the component**

Write `apps/app/components/NextMilestonePreview.tsx`:

```tsx
import { StyleSheet, Text, View } from "react-native";

const MILESTONES: Array<{ day: number; description: string }> = [
  { day: 3, description: "Signature A unlocks" },
  { day: 7, description: "Signature B unlocks" },
  { day: 14, description: "+1 concurrent billboard" },
  { day: 30, description: "Signature C unlocks" },
];

type Props = { currentStreak: number };

export function NextMilestonePreview({ currentStreak }: Props) {
  const next = MILESTONES.find((m) => m.day > currentStreak);

  if (!next) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>All streak milestones earned!</Text>
      </View>
    );
  }

  const daysToGo = next.day - currentStreak;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {daysToGo} day{daysToGo === 1 ? "" : "s"} to day {next.day}: {next.description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  label: {
    color: "#8B7340",
    fontFamily: "Jersey10",
    fontSize: 16,
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck:app
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/app/components/NextMilestonePreview.tsx
git commit -m "app: NextMilestonePreview component"
```

---

### Task 16: Wire NextMilestonePreview into Quests screen

**Files:**
- Modify: `apps/app/app/(app)/quests.tsx`

- [ ] **Step 1: Import and render under the daily quest section**

In `apps/app/app/(app)/quests.tsx`, add the import near the other component imports:

```tsx
import { NextMilestonePreview } from "@/components/NextMilestonePreview";
```

Then in the JSX, find the `<Section title="Daily Quest">` block and add the preview after the QuestCard / inside the same Section. Locate this block (around lines 75-87) and change it to:

```tsx
<Section title="Daily Quest">
  {dailyQuest ? (
    <>
      <QuestCard
        isClaiming={claimingId === dailyQuest.id}
        onClaim={handleClaim}
        progress={dailyQuest as QuestProgress}
      />
      <NextMilestonePreview currentStreak={streak} />
    </>
  ) : (
    <Card>
      <Text style={styles.emptyText}>No daily quest today. Check back tomorrow!</Text>
    </Card>
  )}
</Section>
```

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck:app
```

Expected: PASS.

- [ ] **Step 3: Smoke check**

Refresh the Expo app. Below the daily quest card, you should see a line like "4 days to day 7: Signature B unlocks" (depends on the current `streak` value in the mock — defaults to 7, so it would say "7 days to day 14: +1 concurrent billboard").

- [ ] **Step 4: Commit**

```bash
git add apps/app/app/(app)/quests.tsx
git commit -m "app: show next streak milestone under daily quest"
```

---

### Task 17: Update mockQuests so daily reward = 0 XP

**Why:** The screen still consumes `mockQuestsResponse` from `apps/app/lib/mockQuests.ts`. Per Task 9, daily quests award 0 XP. Make the mock match so the UI represents the truth.

**Files:**
- Modify: `apps/app/lib/mockQuests.ts:20-49`

- [ ] **Step 1: Set daily quest xpReward and template xpReward to 0**

In `apps/app/lib/mockQuests.ts`, find the `dailyQuest` block (lines 20-49). Change `xpReward: 50` (line 35) to `xpReward: 0`, and inside `template`, change `xpReward: 50` (line 45) to `xpReward: 0`.

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck:app
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/app/lib/mockQuests.ts
git commit -m "app: mock daily quest awards 0 XP"
```

---

### Task 18: Signature endpoints in the app API helper

**Files:**
- Modify: `apps/app/lib/api.ts`

- [ ] **Step 1: Append signature helpers**

At the END of `apps/app/lib/api.ts`, append:

```ts
import type {
  EquipSignatureInput,
  EquipSignatureResponse,
  ListMySignaturesResponse,
  ListSignaturesResponse,
} from "@repo/shared";

export function fetchSignatureCatalog() {
  return apiFetch<ListSignaturesResponse>("/api/signatures");
}

export function fetchMySignatures() {
  return apiFetch<ListMySignaturesResponse>("/api/users/me/signatures");
}

export function equipSignature(input: EquipSignatureInput) {
  return apiFetch<EquipSignatureResponse>("/api/users/me/signature", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
```

(The shared package is already a workspace dep — no install needed.)

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck:app
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/app/lib/api.ts
git commit -m "app: signature API client helpers"
```

---

### Task 19: Signature picker in profile (gated by L4)

**Why:** Spec §4.6: signature feature unlocks at L4. UI must surface picker only when feature unlocked, otherwise show a "banking" message.

**Files:**
- Modify: `apps/app/app/(app)/profile.tsx`

- [ ] **Step 1: Replace the profile placeholder with a signature picker**

Replace the entire contents of `apps/app/app/(app)/profile.tsx` with:

```tsx
import type { UserSignature } from "@repo/shared";
import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { equipSignature, fetchMySignatures } from "@/lib/api";

type State =
  | { kind: "loading" }
  | { kind: "ready"; featureUnlocked: boolean; signatures: UserSignature[] }
  | { kind: "error"; message: string };

export default function ProfileScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [equipping, setEquipping] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchMySignatures();
      setState({
        kind: "ready",
        featureUnlocked: data.signatureFeatureUnlocked,
        signatures: data.unlocked,
      });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to load signatures",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleEquip = useCallback(
    async (id: string | null) => {
      setEquipping(id ?? "none");
      try {
        await equipSignature({ signatureId: id });
        await load();
      } finally {
        setEquipping(null);
      }
    },
    [load],
  );

  return (
    <Screen>
      <Text style={styles.title}>Profile</Text>

      {state.kind === "loading" ? (
        <Text style={styles.subtitle}>Loading…</Text>
      ) : state.kind === "error" ? (
        <Card>
          <Text style={styles.error}>{state.message}</Text>
        </Card>
      ) : !state.featureUnlocked ? (
        <Card>
          <Text style={styles.subtitle}>
            Reach level 4 to equip your earned signatures. You have{" "}
            {state.signatures.length} signature
            {state.signatures.length === 1 ? "" : "s"} banked.
          </Text>
        </Card>
      ) : state.signatures.length === 0 ? (
        <Card>
          <Text style={styles.subtitle}>
            No signatures yet — keep your daily streak alive to unlock them at days 3, 7, and 30.
          </Text>
        </Card>
      ) : (
        <View style={styles.list}>
          <Text style={styles.subtitle}>Signature</Text>
          <Pressable
            disabled={equipping !== null}
            onPress={() => handleEquip(null)}
            style={styles.row}
          >
            <View style={styles.swatchEmpty} />
            <Text style={styles.rowLabel}>None</Text>
          </Pressable>
          {state.signatures.map((entry) => (
            <Pressable
              disabled={equipping !== null}
              key={entry.signature.id}
              onPress={() => handleEquip(entry.signature.id)}
              style={[styles.row, entry.isEquipped && styles.rowEquipped]}
            >
              <Image source={{ uri: entry.signature.assetBase64 }} style={styles.swatch} />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{entry.signature.name}</Text>
                <Text style={styles.rowSub}>
                  Day {entry.signature.streakDayRequired}{" "}
                  {entry.isEquipped ? "· equipped" : ""}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: "#6A401A",
    fontFamily: "Jersey10",
    fontSize: 34,
  },
  subtitle: {
    color: "#71730E",
    fontFamily: "Jersey10",
    fontSize: 18,
  },
  error: {
    color: "#A14640",
    fontFamily: "Jersey10",
    fontSize: 18,
  },
  list: {
    gap: 8,
    marginTop: 12,
  },
  row: {
    alignItems: "center",
    backgroundColor: "#FFF5E6",
    borderColor: "#B17833",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 10,
  },
  rowEquipped: {
    backgroundColor: "#E9D8B5",
    borderWidth: 2,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: "#6A401A",
    fontFamily: "Jersey10",
    fontSize: 22,
  },
  rowSub: {
    color: "#8B7340",
    fontFamily: "Jersey10",
    fontSize: 14,
  },
  swatch: {
    backgroundColor: "#FFFFFF",
    borderColor: "#B17833",
    borderRadius: 4,
    borderWidth: 1,
    height: 32,
    width: 32,
  },
  swatchEmpty: {
    backgroundColor: "transparent",
    borderColor: "#B17833",
    borderRadius: 4,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 32,
    width: 32,
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck:app
```

Expected: PASS.

- [ ] **Step 3: Smoke check (UI)**

Open the Profile tab. Should display "Loading…" briefly, then a banked-signatures message for the L1 demo user. If you `update app.users set level = 4 where id = '00000000-0000-4000-8000-000000000002';` and refresh, the picker should appear (likely still empty since no signatures unlocked).

- [ ] **Step 4: Commit**

```bash
git add apps/app/app/(app)/profile.tsx
git commit -m "app: signature picker on profile, gated by L4"
```

---

## Phase E — Final verification

### Task 20: Full repo check + manual end-to-end smoke

- [ ] **Step 1: Run full check**

```bash
bun run check
```

Expected: 0 errors across lint, format, and typecheck.

- [ ] **Step 2: End-to-end smoke (manual)**

Reset DB:

```bash
D1 CLI "$CLOUDFLARE_D1_DATABASE_ID" -f packages/db/d1/schema.sql
```

Start API and app:

```bash
bun --cwd apps/api dev &
bun --cwd apps/app start
```

Walk through:
1. `GET /api/quests` — should return one daily quest (`xpReward: 0` in the daily-template shape if the SELECT is reading from `daily_quest_pool` — re-verify that the read path normalises daily XP to 0) and one or more level quests for the demo user's current level.
2. Manually advance `daily_streak` to 3 for the demo user via D1 CLI, then claim today's daily. Verify `user_signatures` now has the day-3 signature.
3. Set `daily_streak = 14`, claim daily. Verify `level_perks` has a level=0 row for `max_concurrent_billboards`, `user_perk_unlocks` has the matching row, and `GET /api/users/me/progress` returns `maxConcurrentBillboards` = base+streak.
4. App: Quests tab shows "+1 streak" reward on the daily card and a next-milestone hint underneath.
5. App: Profile tab shows the banking message for L1; if you bump the user to L4 in DB, the picker appears.

- [ ] **Step 3: No commit unless smoke surfaces additional fixes.**

---

## Out of scope (deferred per spec §9)

- Streak freezes / one-day skip protection.
- Real signature pixel art (the team designs these; placeholder PNGs are seeded).
- Achievement-style perks beyond streak milestones.
- A parallel "daily level" system (rejected during brainstorming).
- Per-template per-tier randomisation per user (current model uses deterministic seeded targets per `level_quest_sets` row — counts as "randomised" by varying targets across templates within a tier; per-user randomisation is a future enhancement and would require dropping `level_quest_sets.target_count` in favour of runtime random draws against the template's `[minTarget, maxTarget]` range).
- Replacing the mock-driven `quests.tsx` data flow with the real `/api/quests` endpoint (the mock already matches the wire shape and the backend is wired — the swap is a one-liner change that can ship when the auth flow is final).
