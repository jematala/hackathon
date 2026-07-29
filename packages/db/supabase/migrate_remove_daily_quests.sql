-- Forward migration: bring an EXISTING (live) database in line with the
-- daily-quest removal. reset.sql was updated for fresh rebuilds; a live DB with
-- real users needs this incremental migration instead of a destructive reset.
--
-- Safe to re-run: every step is guarded (if exists / delete-where).
--
-- Why it's needed: the new API's ensureQuestProgress does
--   on conflict (user_id, source, source_id) do nothing
-- but a live DB still has the two *partial* unique indexes (keyed on active_on),
-- and Postgres will not infer a partial index as the ON CONFLICT arbiter without
-- its predicate. So the new code throws 42P10 on that insert until the indexes
-- are replaced. It also still holds 110 daily_quest rows the new schema forbids.

begin;

-- 1. Remove daily quest progress (source_id points at daily_quest_pool, which goes below).
delete from app.user_quest_progress where source = 'daily_quest';

-- 2. Swap the two partial unique indexes for the single plain one the new
--    ON CONFLICT (user_id, source, source_id) requires.
drop index if exists app.user_quest_progress_level_unique_idx;
drop index if exists app.user_quest_progress_daily_unique_idx;

-- 3. active_on only existed to distinguish daily instances; drop it (takes any
--    dependent CHECK with it).
alter table app.user_quest_progress drop column if exists active_on cascade;

create unique index if not exists user_quest_progress_unique_idx
  on app.user_quest_progress (user_id, source, source_id);

-- 4. Drop the now-unused daily/streak tables (child before parent).
drop table if exists app.daily_quest_pool;
drop table if exists app.daily_quest_templates;
drop table if exists app.streak_reward_definitions;

-- 5. Drop the streak columns the new user queries no longer read.
alter table app.users
  drop column if exists daily_streak,
  drop column if exists last_daily_claimed_on,
  drop column if exists streak_updated_on;

commit;

-- Not dropped: the 'daily_quest' label on the quest_source enum. Postgres can't
-- remove an enum value in-place, and once the rows above are gone it is simply an
-- unused label. reset.sql declares the enum with only 'level_quest'; this is the
-- one accepted drift between a migrated live DB and a freshly reset one.
