# Leveling & Quest System Design

**Date:** 2026-05-20
**Status:** Draft for review
**Resolves:** Daily-quest / level-quest interaction ambiguity in PRD §6.1, §6.2, §6.3

---

## 1. Goal

Define exactly how the level quest track and the daily quest track interact (or, more accurately, do **not** interact), so the implementation, schema, and UI all agree on a single coherent model. The PRD's two-track wording is sound, but it left enough gaps (what does XP do? do daily quests award XP? what do "XP multipliers" multiply?) that the mock data drifted from the spec. This document closes those gaps.

---

## 2. Model: two parallel tracks

The system has **two independent progression tracks** that never feed into each other.

| Track | Driver | Reward |
|---|---|---|
| **Level Quests** | Complete all quests in your current tier | Level up → capacity perks (billboard slots, sticker slots, signature feature, etc.) |
| **Daily Quest** | Complete one rotating quest per Sydney calendar day | +1 streak → milestone perks (signature designs + one capacity bump at day 14) |

XP exists only as the visual fuel for the level-quest ring on the map HUD. Each tier quest carries an XP value; the ring fills as you finish tier quests; the ring is full exactly when you've finished all of them → level up.

**Daily quests award 0 XP.** They contribute only to the streak counter. The `xp_reward` field on daily quest rows should be dropped (or always 0) in both the DB and the shared types. The PRD's "Streaks grant cosmetics, XP multipliers" line is treated as cruft — XP multipliers are removed from the design.

---

## 3. Level quest mechanics

### 3.1 Tier sizing

Number of quests per tier ramps gently with level. The slope is deliberately shallow — fewer quests per tier, but with **larger target values** so each individual quest takes longer to complete (see §3.2).

| Level | Quests in tier |
|---|---|
| 1 | 1 |
| 2 | 2 |
| 3 | 2 |
| 4 | 3 |
| 5 | 3 |
| 6 | 3 |
| 7 | 4 |
| 8 | 4 |
| 9 | 5 |
| 10 | 5 |

Total quests to reach max level = 32. L1 is intentionally a single-quest tutorial-feel tier so the first level-up is quick and demo-friendly.

### 3.2 Quest generation

When a tier begins (user signs up at L1, or levels up into the next tier), the backend generates the tier's quest set:

- Draw `tier_size` distinct **quest templates** from the 5 PRD templates: `visit_pois`, `leave_billboards`, `place_stickers`, `receive_replies`, `save_stickers`.
- **No template repeats within a tier** — each quest is a different type. (At L9 / L10 with 5 quests, all 5 templates are used.)
- Each quest's target value is randomised within the template's `[minTarget, maxTarget]` range, **scaled by tier**. Targets are larger than they would be in the original PRD spec, because we have fewer quests per tier and each one needs to feel substantive. Indicative ranges:

  | Template | L1 | L5 | L10 |
  |---|---|---|---|
  | `visit_pois` | 3–4 | 6–8 | 10–12 |
  | `leave_billboards` | 2–3 | 4–6 | 7–10 |
  | `place_stickers` | 2–3 | 5–7 | 8–12 |
  | `receive_replies` | 1–2 | 3–5 | 6–8 |
  | `save_stickers` | 2–3 | 4–6 | 8–10 |

  Concrete final ranges are deferred to balancing (see §9).

- Each quest carries an XP reward (informs the ring's progress weight). XP reward magnitudes scale with target value so the ring fills proportionally to the work involved.

### 3.3 Progression & claim flow

- A quest tracks `progressCount` against `targetCount`. Only events that happen **after** the quest was issued count toward progress (no retroactive completion from past activity).
- When `progressCount >= targetCount`, the quest enters the **claimable** state (`completedAt` and `claimableAt` set).
- The user taps Claim on the quest card. The quest enters the **claimed** state (`claimedAt`, `claimedXp` set).
- When **all** quests in the current tier are claimed, the user levels up: next tier's quests are generated, level perks unlocked, level-up overlay shown.

### 3.4 Expiry

Tier quests **do not expire**. They sit until completed and claimed.

### 3.5 Max level (L10)

At L10, no further tiers are generated. The Quest screen still shows the daily quest section. The level quest section displays a "Max level reached" empty state.

---

## 4. Daily quest mechanics

### 4.1 Rotation

A scheduled Worker selects one daily quest per Sydney calendar day:

- Pulls one template from the seeded daily-quest pool (~5 templates).
- Generates a target value within the template's `[minTarget, maxTarget]` range.
- The daily quest row is written with `activeOn` = today's Sydney date.

### 4.2 Expiry & claim

- The daily quest is valid only on its `activeOn` date (Sydney calendar day).
- Completion: when `progressCount >= targetCount`, the daily becomes claimable.
- The user taps Claim → `streak += 1` and the streak milestone check runs.
- If the user does not claim the daily before Sydney midnight, it **expires unclaimed**. There is no recovery — the streak is at risk (see 4.4).
- Daily quests carry **no XP** and do **not** contribute to the level-quest ring.

### 4.3 Progress accounting

Same rule as tier quests: only events that happen after the daily quest was issued count. (The Worker that generates daily quests runs at Sydney midnight, so practically this means events during today's Sydney day count.)

### 4.4 Streak break

Hard reset to 0:

- A scheduled Worker runs at (or shortly after) Sydney midnight each day.
- For every user whose **previous-day daily quest** is unclaimed at that moment, the Worker sets `streak = 0`.
- Note: this applies whether the daily was incomplete *or* completed-but-unclaimed. Users must both finish AND claim before midnight.

### 4.5 Streak milestone rewards

Milestone rewards are **permanent** — once earned, they stay even if the streak resets. Breaking the streak rewinds the streak counter, not the earned perks.

| Streak day | Reward | Type |
|---|---|---|
| 3 | Signature variant A | Cosmetic |
| 7 | Signature variant B | Cosmetic |
| 14 | +1 concurrent billboard slot | Capacity |
| 30 | Signature variant C (prestige design) | Cosmetic |

Signatures are pre-designed 64×64 (or similar) pixel art assets created by the team and stored as base64 PNG in a seed table.

### 4.6 Signature banking & display

- **Earning** a signature happens at the streak milestone, regardless of user level.
- **Displaying** a signature requires the user to have unlocked the signature feature at L4 (see §5 perk table).
- A user who hits day 14 streak at L2 has signatures A and B banked. They become equippable as soon as the user reaches L4.

### 4.7 Capacity perks vs. level

Capacity perks awarded by streak (currently only the day-14 +1 billboard) apply **immediately** regardless of level. Capacity is computed additively:

```
final_capacity = base + sum(level_perks_unlocked) + sum(streak_perks_unlocked)
```

A L10 user with day-14 streak has **6 concurrent billboards** (the level-path max of 5 + 1 from streak). 5 is the "normal" ceiling reachable purely through leveling; 6 is the prestige outcome reserved for dedicated daily-streak players. The streak path always provides a real bonus, even for max-level players.

---

## 5. Level perk table

Revised from PRD §6.3 to keep concurrent-billboard counts modest (level-path cap of 5 — design rule: "no one should normally have more than 5 active billboards at a time"). The day-14 streak perk can push the absolute max to 6 (see §4.7).

| Level | Perk | Concurrent | Per day | Sticker slots |
|---|---|---|---|---|
| 1 (base) | 3 concurrent billboards, 4 billboards/day, 10 sticker slots | 3 | 4 | 10 |
| 2 | +1 concurrent billboard, +1 billboards/day | 4 | 5 | 10 |
| 3 | +2 sticker slots | 4 | 5 | 12 |
| 4 | **Unlocks signature display** — user can equip signatures earned via streak | 4 | 5 | 12 |
| 5 | +1 billboards/day | 4 | 6 | 12 |
| 6 | Note border flair (cosmetic) | 4 | 6 | 12 |
| 7 | +2 sticker slots | 4 | 6 | 14 |
| 8 | +1 concurrent billboard, +1 billboards/day | 5 | 7 | 14 |
| 9 | Unique sticker palette expansion | 5 | 7 | 14 |
| 10 | Maxed: +1 billboards/day, +2 sticker slots, all flairs | 5 | 8 | 16 |

Capacity progression by level: concurrent **3 → 4 → 5**; per-day **4 → 5 → 6 → 7 → 8**; sticker slots **10 → 12 → 14 → 16**. No dramatic L10 prestige jump — L10 is the final cosmetic flourish ("all flairs") plus a final +1 per-day and +2 sticker slots.

---

## 6. UI / screen shape

The existing `apps/app/app/(app)/quests.tsx` largely matches this model. Two small alignments are needed:

- **Daily Quest card**: render reward as "+1 to streak" instead of "+N XP". Daily quests do not show an XP value.
- **Next milestone preview**: below the daily card (or inside it), show the next signature/perk unlock — e.g. *"3 days to your next signature (day 7)"* or *"6 days to +1 billboard slot (day 14)"*.
- **Level Quests section**: unchanged from current mock — list of cards with progress + XP reward + claim button.
- **Streak pill** in header: unchanged.

The Map HUD's existing XP ring shows tier-progress (XP earned in current tier / total tier XP possible), filling to 100% exactly when the user is ready to level up.

---

## 7. Data model deltas

What changes vs. the current schema (per `packages/db/src/schema/` and current mock data):

### 7.1 Quest tables

- Daily quest rows: `xp_reward` set to 0 (or column dropped on daily-specific tables). Shared types should reflect that daily quests don't expose `xpReward` to clients.

### 7.2 New tables

**`user_streaks`** — one row per user:
- `user_id` (PK, FK to users)
- `current_streak` (int, default 0)
- `longest_streak` (int, default 0)
- `last_claimed_daily_quest_id` (FK, nullable)
- `last_claimed_at` (timestamptz, nullable)

**`signatures`** — seeded table of available signatures:
- `id` (PK)
- `name` (e.g. "Sunrise", "Neon", "Prestige")
- `asset_base64` (base64 PNG)
- `streak_day_required` (int — the day at which this unlocks, e.g. 3, 7, 30)
- `active` (bool)

**`user_signatures`** — junction table:
- `user_id` (FK)
- `signature_id` (FK)
- `unlocked_at` (timestamptz)
- `is_equipped` (bool, default false; at most one true per user)

**`streak_milestones`** — seeded table of non-signature milestone rewards (currently just day-14 +1 billboard):
- `id` (PK)
- `streak_day_required` (int)
- `perk_type` (enum: `capacity_billboard`, `capacity_sticker_slot`, `cosmetic`, ...)
- `perk_value` (int — e.g. 1 for "+1 billboard")
- `description`

**`user_streak_milestones`** — junction table tracking which milestones a user has unlocked:
- `user_id` (FK)
- `milestone_id` (FK)
- `unlocked_at` (timestamptz)

### 7.3 Level perk table

The existing `level_perks` seed data (or equivalent) should be replaced with the revised table from §5. Key deltas from the PRD's original §6.3 table:

- L2 now also grants +1 billboards/day (in addition to +1 concurrent).
- L4 reworded: "Unlocks signature display" (was: "signature on notes/stickers").
- L5 grants only +1 billboards/day (was: +1 concurrent + 1/day). The concurrent bump that used to be here is gone.
- L8 unchanged in shape but now reaches concurrent = 5, per-day = 7 (was: 6 and 7).
- L10 no longer makes the dramatic prestige jump. Now: +1 per-day (8 total), +2 sticker slots (16 total), all flairs. (Was: 10/10/20.)

### 7.4 Capacity computation

When the API needs to know a user's current capacity (e.g. on billboard post), it computes:

```
billboards_concurrent =
    base.billboards_concurrent
  + sum(level_perks.billboards_concurrent for unlocked levels)
  + sum(streak_milestones.perk_value for unlocked milestones where perk_type = 'capacity_billboard')
```

Same formula shape for `billboards_per_day` and `sticker_slots`.

---

## 8. Edge cases

| Case | Resolution |
|---|---|
| User completes daily quest at 11:59pm Sydney but doesn't tap claim → midnight passes | Streak resets to 0. Claim is no longer possible after midnight. |
| User levels up mid-claim of a tier quest | Standard race-condition handling: the claim transaction includes the level-up logic atomically. The level-up overlay fires once. |
| User hits day 14 streak at L1 | +1 billboard slot applies immediately. Their concurrent cap is 4 (base 3 + streak 1). Signatures from day 3 and 7 are banked, displayable at L4. |
| User reaches L10 with day-14 streak | Concurrent cap is 6 (level path 5 + streak 1). Per-day cap is 8. Sticker slots 16. |
| User reaches L10 then breaks streak then re-streaks | Already-unlocked streak perks (signatures A/B/C, +1 billboard) remain. The streak counter goes back to 0 and re-climbs; nothing new unlocks until they pass days 3/7/14/30 again — but the perks they already have don't re-trigger. |
| User has a 14-day streak, then misses, then re-streaks past day 14 again | Day-14 milestone fires only on the first time it's reached. (Tracked via `user_streak_milestones`.) Subsequent crossings do nothing. |
| Tier quest target events happen before quest issued (race) | Don't count. Progress is strictly forward-looking from the quest's `issuedAt`. |

---

## 9. Out of scope (for now)

These are deliberately deferred:

- Streak freezes / one-day skip protection (PRD silent; deferred unless retention demands it).
- Per-template per-tier target ranges — picked during gameplay balancing.
- Specific signature designs — art task, not a system design concern.
- Achievement-style perks beyond streak milestones.
- A parallel "daily level" system (rejected during brainstorming).

---

## 10. Implementation summary

For the implementation plan, the work breaks down roughly as:

1. **Schema migrations**: new tables (`user_streaks`, `signatures`, `user_signatures`, `streak_milestones`, `user_streak_milestones`); drop/zero `xp_reward` on daily quest rows.
2. **Quest generation logic**: when a user levels up (or signs up at L1), generate tier quests per §3.1, §3.2.
3. **Daily quest Worker**: scheduled job at Sydney midnight that picks today's daily quest from the pool.
4. **Streak break Worker**: scheduled job after Sydney midnight that resets streaks for users who didn't claim yesterday's daily.
5. **Claim endpoints**: tier quest claim, daily quest claim (with streak +1 and milestone unlock side effects).
6. **Capacity API**: helper that computes a user's current limits per §7.4.
7. **Shared types**: drop `xpReward` from daily quest types; add streak/signature/milestone types.
8. **Frontend**: update `quests.tsx` to render daily reward as "+1 streak" + next milestone preview. Add signature picker to profile (gated by L4).
