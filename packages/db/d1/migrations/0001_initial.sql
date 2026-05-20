
create table users (
  id text primary key,
  clerk_user_id text not null unique,
  username text not null unique,
  display_name text not null,
  avatar_base64 text,
  is_admin boolean not null default false,
  level integer not null default 1 check (level >= 1),
  xp integer not null default 0 check (xp >= 0),
  daily_streak integer not null default 0 check (daily_streak >= 0),
  streak_updated_on date,
  last_daily_claimed_on date,
  banned_at text,
  deleted_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table push_tokens (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  token text not null unique,
  platform push_platform not null default 'expo',
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  revoked_at text
);

create table campuses (
  id text primary key,
  name text not null,
  timezone text not null,
  center_lat real not null,
  center_lng real not null,
  radius_meters integer not null check (radius_meters > 0),
  bounds text not null,
  map_provider text not null default 'openstreetmap',
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table pois (
  id text primary key,
  campus_id text not null references campuses(id) on delete cascade,
  title text not null,
  description text,
  picture_base64 text,
    lat real not null,
  lng real not null,
  radius_meters integer not null default 30 check (radius_meters > 0),
  is_active boolean not null default true,
  created_by text references users(id) on delete set null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at text
);

create table poi_visits (
  user_id text not null references users(id) on delete cascade,
  poi_id text not null references pois(id) on delete cascade,
  visited_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  visited_on date not null default (date('now', '+10 hours')),
  primary key (user_id, poi_id)
);

create table poi_daily_activations (
  campus_id text not null references campuses(id) on delete cascade,
  poi_id text not null references pois(id) on delete cascade,
  active_on date not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (campus_id, poi_id, active_on)
);

create table billboards (
  id text primary key,
  campus_id text not null references campuses(id) on delete cascade,
  author_id text not null references users(id) on delete cascade,
  body text not null,
    lat real not null,
  lng real not null,
  status content_status not null default 'pending',
  moderation_summary text,
  empty_expires_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+24 hours')),
  expires_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+5 days')),
  hidden_at text,
  deleted_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table sticker_assets (
  id text primary key,
  owner_id text not null references users(id) on delete cascade,
  png_base64 text not null,
  width integer not null default 64 check (width > 0),
  height integer not null default 64 check (height > 0),
  palette text,
  status content_status not null default 'pending',
  moderation_summary text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at text
);

create table billboard_placements (
  id text primary key,
  billboard_id text not null references billboards(id) on delete cascade,
  author_id text not null references users(id) on delete cascade,
  kind placement_kind not null,
  x real not null check (x >= 0 and x <= 1),
  y real not null check (y >= 0 and y <= 1),
  z_index integer not null default 0,
  sticker_asset_id text references sticker_assets(id) on delete restrict,
  body text,
  status content_status not null default 'pending',
  moderation_summary text,
  hidden_at text,
  deleted_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  check (
    (
      kind = 'sticker'
      and sticker_asset_id is not null
      and body is null
    )
    or (
      kind = 'sticky_note'
      and sticker_asset_id is null
      and body is not null
    )
  )
);

create table saved_stickers (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  kind saved_sticker_kind not null,
  sticker_asset_id text references sticker_assets(id) on delete cascade,
  body text,
  label text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at text,
  check (
    (
      kind = 'sticker'
      and sticker_asset_id is not null
      and body is null
    )
    or (
      kind = 'sticky_note'
      and sticker_asset_id is null
      and body is not null
    )
  )
);

create table quest_templates (
  id text primary key,
  key text not null unique,
  trigger_type quest_trigger_type not null,
  title_template text not null,
  description_template text not null,
  min_target integer not null check (min_target > 0),
  max_target integer not null check (max_target >= min_target),
  xp_reward integer not null check (xp_reward >= 0),
  active boolean not null default true,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table daily_quest_templates (
  id text primary key,
  key text not null unique,
  trigger_type quest_trigger_type not null,
  title_template text not null,
  description_template text not null,
  min_target integer not null check (min_target > 0),
  max_target integer not null check (max_target >= min_target),
  xp_reward integer not null check (xp_reward >= 0),
  active boolean not null default true,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table level_quest_sets (
  id text primary key,
  level integer not null check (level >= 1),
  template_id text not null references quest_templates(id) on delete restrict,
  target_count integer not null check (target_count > 0),
  xp_reward integer not null check (xp_reward >= 0),
  sort_order integer not null default 0,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  unique (level, sort_order)
);

create table daily_quest_pool (
  id text primary key,
  template_id text not null references daily_quest_templates(id) on delete restrict,
  target_count integer not null check (target_count > 0),
  xp_reward integer not null check (xp_reward >= 0),
  active boolean not null default true,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table daily_quest_assignments (
  id text primary key,
  campus_id text not null references campuses(id) on delete cascade,
  active_on date not null,
  daily_quest_pool_id text not null references daily_quest_pool(id) on delete restrict,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  unique (campus_id, active_on)
);

create table user_quest_progress (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  source quest_source not null,
  source_id text not null,
  active_on date,
  progress_count integer not null default 0 check (progress_count >= 0),
  target_count integer not null check (target_count > 0),
  completed_at text,
  claimable_at text,
  claimed_at text,
  claimed_xp integer check (claimed_xp is null or claimed_xp >= 0),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  check (
    (
      source = 'daily_quest'
      and active_on is not null
    )
    or (
      source = 'level_quest'
      and active_on is null
    )
  )
);

create table perk_definitions (
  id text primary key,
  key text not null unique,
  name text not null,
  description text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table level_perks (
  id text primary key,
  level integer not null check (level >= 0),
  perk_id text not null references perk_definitions(id) on delete restrict,
  numeric_value integer,
  metadata text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  unique (level, perk_id)
);

create table user_perk_unlocks (
  user_id text not null references users(id) on delete cascade,
  level_perk_id text not null references level_perks(id) on delete restrict,
  source_level integer not null check (source_level >= 0),
  unlocked_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (user_id, level_perk_id)
);

create table streak_reward_definitions (
  id text primary key,
  streak_days integer not null unique check (streak_days > 0),
  name text not null,
  reward text not null check (json_type(reward) = 'object'),
  active boolean not null default true,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table reports (
  id text primary key,
  reporter_id text not null references users(id) on delete cascade,
  target_type report_target_type not null,
  target_id text not null,
  reason report_reason not null,
  details text,
  status report_status not null default 'open',
  admin_notes text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  unique (reporter_id, target_type, target_id)
);

create table moderation_actions (
  id text primary key,
  report_id text references reports(id) on delete set null,
  admin_id text not null references users(id) on delete restrict,
  action moderation_action_type not null,
  target_type report_target_type not null,
  target_id text not null,
  notes text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table content_moderation_logs (
  id text primary key,
  target_type content_moderation_target_type not null,
  target_id text not null,
  provider text not null default 'openai',
  flagged boolean not null,
  categories text,
  scores text,
  raw_response text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table signatures (
  id text primary key,
  key text not null unique,
  name text not null,
  asset_base64 text not null,
  streak_day_required integer not null check (streak_day_required > 0),
  active boolean not null default true,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table user_signatures (
  user_id text not null references users(id) on delete cascade,
  signature_id text not null references signatures(id) on delete cascade,
  unlocked_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  is_equipped boolean not null default false,
  primary key (user_id, signature_id)
);

create unique index user_signatures_one_equipped_idx
  on user_signatures (user_id) where is_equipped;

create index pois_active_campus_idx on pois (campus_id, is_active) where deleted_at is null;
create index poi_visits_poi_idx on poi_visits (poi_id);
create index billboards_active_idx on billboards (campus_id, status, expires_at) where deleted_at is null;
create index billboards_author_day_idx on billboards (
  author_id,
  date(created_at, '+10 hours')
);
create unique index billboard_placements_one_per_user_idx on billboard_placements (
  billboard_id,
  author_id
)
where deleted_at is null;
create index billboard_placements_billboard_idx on billboard_placements (billboard_id, z_index);
create index sticker_assets_owner_idx on sticker_assets (owner_id);
create index saved_stickers_user_idx on saved_stickers (user_id) where deleted_at is null;
create unique index user_quest_progress_level_unique_idx on user_quest_progress (
  user_id,
  source,
  source_id
)
where active_on is null;
create unique index user_quest_progress_daily_unique_idx on user_quest_progress (
  user_id,
  source,
  source_id,
  active_on
)
where active_on is not null;
create index user_quest_progress_user_idx on user_quest_progress (user_id);
create index reports_status_idx on reports (status, created_at);

insert into campuses (id, name, timezone, center_lat, center_lng, radius_meters, bounds)
values (
  '00000000-0000-4000-8000-000000000100',
  'UNSW Kensington',
  'Australia/Sydney',
  -33.9173,
  151.2313,
  1200,
  '{"north":-33.9095,"south":-33.9249,"east":151.2398,"west":151.2252}'
);

insert into pois (id, campus_id, title, description, lat, lng)
values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000100', 'Main Library', 'A busy study landmark near the centre of campus.', -33.9173, 151.2313),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000100', 'Basser Steps', 'A classic meeting spot between upper and lower campus.', -33.9179, 151.2298),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000100', 'Quadrangle Lawn', 'Open green space for quick quest stops.', -33.9170, 151.2334),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000100', 'Red Centre', 'A bright landmark for art, design, and engineering students.', -33.9161, 151.2306),
  ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000100', 'Village Green', 'A broad outdoor hub for lunch breaks and quick meetups.', -33.9152, 151.2345),
  ('00000000-0000-4000-8000-000000000206', '00000000-0000-4000-8000-000000000100', 'Science Theatre', 'A lower-campus lecture landmark with steady student traffic.', -33.9192, 151.2291);

insert into quest_templates (id, key, trigger_type, title_template, description_template, min_target, max_target, xp_reward)
values
  ('00000000-0000-4000-8000-000000000301', 'visit_pois', 'visit_pois', 'Visit {target} new POIs', 'Discover {target} campus landmarks you have not visited before.', 1, 15, 50),
  ('00000000-0000-4000-8000-000000000302', 'leave_billboards', 'leave_billboards', 'Leave {target} billboards', 'Post {target} notes around campus.', 1, 12, 50),
  ('00000000-0000-4000-8000-000000000303', 'place_stickers', 'place_stickers', 'Place {target} stickers', 'Reply to billboards with {target} sticker placements.', 1, 12, 50),
  ('00000000-0000-4000-8000-000000000304', 'receive_replies', 'receive_replies', 'Receive {target} replies', 'Have other students reply to your billboards {target} times.', 1, 10, 75),
  ('00000000-0000-4000-8000-000000000305', 'save_stickers', 'save_stickers', 'Save {target} stickers', 'Save {target} stickers or sticky notes to your collection.', 1, 12, 40);

insert into daily_quest_templates (id, key, trigger_type, title_template, description_template, min_target, max_target, xp_reward)
values
  ('00000000-0000-4000-8000-000000000401', 'daily_explorer', 'visit_pois', 'Daily wander', 'Visit {target} active POIs today.', 1, 3, 0),
  ('00000000-0000-4000-8000-000000000402', 'daily_note', 'leave_billboards', 'Campus bulletin', 'Leave {target} billboard today.', 1, 2, 0),
  ('00000000-0000-4000-8000-000000000403', 'daily_sticker', 'place_stickers', 'Sticker hello', 'Place {target} stickers on billboards today.', 1, 3, 0),
  ('00000000-0000-4000-8000-000000000404', 'daily_save', 'save_stickers', 'Pocket a favourite', 'Save {target} sticker or sticky note today.', 1, 2, 0),
  ('00000000-0000-4000-8000-000000000405', 'daily_replies', 'receive_replies', 'Start a conversation', 'Receive {target} replies on your billboards today.', 1, 2, 0);

insert into level_quest_sets (id, level, template_id, target_count, xp_reward, sort_order)
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

insert into daily_quest_pool (id, template_id, target_count, xp_reward)
values
  ('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000401', 1, 0),
  ('00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-000000000402', 1, 0),
  ('00000000-0000-4000-8000-000000000603', '00000000-0000-4000-8000-000000000403', 2, 0),
  ('00000000-0000-4000-8000-000000000604', '00000000-0000-4000-8000-000000000404', 1, 0),
  ('00000000-0000-4000-8000-000000000605', '00000000-0000-4000-8000-000000000405', 1, 0);

insert into perk_definitions (id, key, name, description)
values
  ('00000000-0000-4000-8000-000000000800', 'max_concurrent_billboards', 'Concurrent billboards', 'Maximum active billboards a user can maintain.'),
  ('00000000-0000-4000-8000-000000000801', 'daily_billboard_limit', 'Daily billboard limit', 'Billboards a user can post per calendar day.'),
  ('00000000-0000-4000-8000-000000000802', 'sticker_slots', 'Sticker slots', 'Saved sticker and sticky note collection capacity.'),
  ('00000000-0000-4000-8000-000000000803', 'note_signature', 'Note signature', 'Cosmetic signature on notes and stickers.'),
  ('00000000-0000-4000-8000-000000000804', 'note_border_flair', 'Note border flair', 'Cosmetic border treatment for notes.'),
  ('00000000-0000-4000-8000-000000000805', 'palette_expansion', 'Palette expansion', 'Additional sticker colour palette.');

insert into level_perks (id, level, perk_id, numeric_value, metadata)
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
  ('00000000-0000-4000-8000-000000000906', 4, '00000000-0000-4000-8000-000000000803', null, '{"enabled":true}'),
  -- L5: +1 per day (no concurrent bump per revised spec)
  ('00000000-0000-4000-8000-000000000908', 5, '00000000-0000-4000-8000-000000000801', 6, null),
  -- L6: note border flair
  ('00000000-0000-4000-8000-000000000909', 6, '00000000-0000-4000-8000-000000000804', null, '{"enabled":true}'),
  -- L7: +2 sticker slots
  ('00000000-0000-4000-8000-00000000090a', 7, '00000000-0000-4000-8000-000000000802', 14, null),
  -- L8: +1 concurrent, +1 per day (final concurrent bump from leveling)
  ('00000000-0000-4000-8000-00000000090b', 8, '00000000-0000-4000-8000-000000000800', 5, null),
  ('00000000-0000-4000-8000-00000000090c', 8, '00000000-0000-4000-8000-000000000801', 7, null),
  -- L9: palette expansion
  ('00000000-0000-4000-8000-00000000090d', 9, '00000000-0000-4000-8000-000000000805', null, '{"palette":"extended"}'),
  -- L10: +1 per day, +2 sticker slots (no concurrent bump — capped at 5 from L8)
  ('00000000-0000-4000-8000-00000000090f', 10, '00000000-0000-4000-8000-000000000801', 8, null),
  ('00000000-0000-4000-8000-000000000910', 10, '00000000-0000-4000-8000-000000000802', 16, null);

insert into streak_reward_definitions (id, streak_days, name, reward)
values
  ('00000000-0000-4000-8000-000000000a01', 3,  'Three day spark',
   '{"rewards":[{"type":"signature","signatureKey":"signature_a"}]}'),
  ('00000000-0000-4000-8000-000000000a02', 7,  'Week one trail',
   '{"rewards":[{"type":"signature","signatureKey":"signature_b"}]}'),
  ('00000000-0000-4000-8000-000000000a03', 14, 'Fortnight forager',
   '{"rewards":[{"type":"capacity_billboard","amount":1}]}'),
  ('00000000-0000-4000-8000-000000000a04', 30, 'Month-long marker',
   '{"rewards":[{"type":"signature","signatureKey":"signature_c"}]}');

insert into signatures (id, key, name, asset_base64, streak_day_required) values ('00000000-0000-4000-8000-000000000b01', 'signature_a', 'Sunrise Mark',    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 3);
insert into signatures (id, key, name, asset_base64, streak_day_required) values ('00000000-0000-4000-8000-000000000b02', 'signature_b', 'Pixel Bloom',     'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 7);
insert into signatures (id, key, name, asset_base64, streak_day_required) values ('00000000-0000-4000-8000-000000000b03', 'signature_c', 'Prestige Cipher', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 30);
