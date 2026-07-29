-- Demo-day quest re-tune: make early levels one-tap so presenters level up live.
-- Idempotent + non-destructive: safe to run against the live DB (no resets, no deletes).
-- Fresh accounts pick this up automatically via ensureQuestProgress on GET /quests.

-- 1. Singular-copy templates for the one-tap early quests.
insert into app.quest_templates (id, key, trigger_type, title_template, description_template, min_target, max_target, xp_reward)
values
  ('00000000-0000-4000-8000-000000000306', 'first_billboard', 'leave_billboards', 'Post your first note', 'Tap a billboard on the map and leave a note for the campus.', 1, 1, 50),
  ('00000000-0000-4000-8000-000000000307', 'first_sticker',   'place_stickers',  'Drop a sticker',        'React to any billboard with a sticker.',                    1, 1, 40),
  ('00000000-0000-4000-8000-000000000308', 'first_visit',     'visit_pois',      'Find a hotspot',        'Walk up to any active spot glowing on the map.',            1, 1, 40)
on conflict (key) do nothing;

-- 2. Repoint / retune level quest sets L1-L5 (update in place, no add/delete -> no orphaned progress).
update app.level_quest_sets set template_id = '00000000-0000-4000-8000-000000000306', target_count = 1, xp_reward = 50, sort_order = 1 where id = '00000000-0000-4000-8000-000000000501'; -- L1

update app.level_quest_sets set template_id = '00000000-0000-4000-8000-000000000307', target_count = 1, xp_reward = 40, sort_order = 1 where id = '00000000-0000-4000-8000-000000000502'; -- L2
update app.level_quest_sets set template_id = '00000000-0000-4000-8000-000000000308', target_count = 1, xp_reward = 40, sort_order = 2 where id = '00000000-0000-4000-8000-000000000503'; -- L2

update app.level_quest_sets set template_id = '00000000-0000-4000-8000-000000000302', target_count = 2, xp_reward = 60, sort_order = 1 where id = '00000000-0000-4000-8000-000000000504'; -- L3 leave 2
update app.level_quest_sets set template_id = '00000000-0000-4000-8000-000000000305', target_count = 1, xp_reward = 40, sort_order = 2 where id = '00000000-0000-4000-8000-000000000505'; -- L3 save 1

update app.level_quest_sets set template_id = '00000000-0000-4000-8000-000000000303', target_count = 3, xp_reward = 60, sort_order = 1 where id = '00000000-0000-4000-8000-000000000506'; -- L4 place 3
update app.level_quest_sets set template_id = '00000000-0000-4000-8000-000000000301', target_count = 3, xp_reward = 60, sort_order = 2 where id = '00000000-0000-4000-8000-000000000507'; -- L4 visit 3
update app.level_quest_sets set template_id = '00000000-0000-4000-8000-000000000305', target_count = 2, xp_reward = 90, sort_order = 3 where id = '00000000-0000-4000-8000-000000000508'; -- L4 save 2 (was receive_replies)

update app.level_quest_sets set target_count = 5, xp_reward = 120 where id = '00000000-0000-4000-8000-000000000509'; -- L5 visit 5

-- 3. Optional: sync EXISTING unclaimed progress rows so accounts created before this
-- migration also get the easy targets (fresh accounts don't need this).
update app.user_quest_progress uqp
set target_count = lqs.target_count,
    progress_count = least(uqp.progress_count, lqs.target_count),
    updated_at = now()
from app.level_quest_sets lqs
where uqp.source = 'level_quest'
  and uqp.source_id = lqs.id
  and uqp.claimed_at is null;

-- 4. Remove visit_pois (hotspot / check-in) quests from L1-5 so no level needs POIs/GPS.
delete from app.user_quest_progress
where source = 'level_quest'
  and source_id in (
    select lqs.id from app.level_quest_sets lqs
    join app.quest_templates qt on qt.id = lqs.template_id
    where lqs.level between 1 and 5 and qt.trigger_type = 'visit_pois'
  );

delete from app.level_quest_sets
where level between 1 and 5
  and template_id in (select id from app.quest_templates where trigger_type = 'visit_pois');
