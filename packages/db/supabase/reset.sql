drop schema if exists app cascade;
create schema app;

create extension if not exists postgis with schema extensions;

create type app.content_status as enum ('pending', 'active', 'hidden', 'removed', 'rejected');
create type app.placement_kind as enum ('sticker', 'sticky_note');
create type app.saved_sticker_kind as enum ('sticker', 'sticky_note');
create type app.quest_trigger_type as enum (
  'visit_pois',
  'leave_billboards',
  'place_stickers',
  'receive_replies',
  'save_stickers'
);
create type app.quest_source as enum ('level_quest');
create type app.content_moderation_target_type as enum ('billboard', 'placement', 'sticker_asset');
create type app.push_platform as enum ('expo', 'ios', 'android', 'web');

create table app.users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  username text not null unique,
  display_name text not null,
  avatar_base64 text,
  level integer not null default 1 check (level >= 1),
  xp integer not null default 0 check (xp >= 0),
  banned_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  token text not null unique,
  platform app.push_platform not null default 'expo',
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table app.campuses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null,
  center_lat double precision not null,
  center_lng double precision not null,
  radius_meters integer not null check (radius_meters > 0),
  bounds jsonb not null,
  map_provider text not null default 'openstreetmap',
  created_at timestamptz not null default now()
);

create table app.pois (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references app.campuses(id) on delete cascade,
  title text not null,
  description text,
  picture_base64 text,
  location_point geography(point, 4326) not null,
  lat double precision not null,
  lng double precision not null,
  radius_meters integer not null default 30 check (radius_meters > 0),
  is_active boolean not null default true,
  created_by uuid references app.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table app.poi_visits (
  user_id uuid not null references app.users(id) on delete cascade,
  poi_id uuid not null references app.pois(id) on delete cascade,
  visited_at timestamptz not null default now(),
  visited_on date not null default ((timezone('Australia/Sydney', now()))::date),
  primary key (user_id, poi_id)
);

create table app.poi_daily_activations (
  campus_id uuid not null references app.campuses(id) on delete cascade,
  poi_id uuid not null references app.pois(id) on delete cascade,
  active_on date not null,
  primary key (campus_id, poi_id, active_on)
);

create table app.billboards (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references app.campuses(id) on delete cascade,
  author_id uuid not null references app.users(id) on delete cascade,
  body text not null,
  location_point geography(point, 4326) not null,
  lat double precision not null,
  lng double precision not null,
  status app.content_status not null default 'pending',
  moderation_summary jsonb,
  empty_expires_at timestamptz not null default (now() + interval '24 hours'),
  expires_at timestamptz not null default (now() + interval '5 days'),
  hidden_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at and expires_at <= created_at + interval '5 days'),
  check (empty_expires_at > created_at and empty_expires_at <= created_at + interval '24 hours')
);

create table app.sticker_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references app.users(id) on delete cascade,
  png_base64 text not null,
  width integer not null default 64 check (width > 0),
  height integer not null default 64 check (height > 0),
  palette jsonb,
  status app.content_status not null default 'pending',
  moderation_summary jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table app.billboard_placements (
  id uuid primary key default gen_random_uuid(),
  billboard_id uuid not null references app.billboards(id) on delete cascade,
  author_id uuid not null references app.users(id) on delete cascade,
  kind app.placement_kind not null,
  x double precision not null check (x >= 0 and x <= 1),
  y double precision not null check (y >= 0 and y <= 1),
  z_index integer not null default 0,
  sticker_asset_id uuid references app.sticker_assets(id) on delete restrict,
  body text,
  status app.content_status not null default 'pending',
  moderation_summary jsonb,
  hidden_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
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

create table app.saved_stickers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  kind app.saved_sticker_kind not null,
  sticker_asset_id uuid references app.sticker_assets(id) on delete cascade,
  body text,
  label text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
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

create table app.quest_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  trigger_type app.quest_trigger_type not null,
  title_template text not null,
  description_template text not null,
  min_target integer not null check (min_target > 0),
  max_target integer not null check (max_target >= min_target),
  xp_reward integer not null check (xp_reward >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table app.level_quest_sets (
  id uuid primary key default gen_random_uuid(),
  level integer not null check (level >= 1),
  template_id uuid not null references app.quest_templates(id) on delete restrict,
  target_count integer not null check (target_count > 0),
  xp_reward integer not null check (xp_reward >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (level, sort_order)
);

create table app.user_quest_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  source app.quest_source not null,
  source_id uuid not null,
  progress_count integer not null default 0 check (progress_count >= 0),
  target_count integer not null check (target_count > 0),
  completed_at timestamptz,
  claimable_at timestamptz,
  claimed_at timestamptz,
  claimed_xp integer check (claimed_xp is null or claimed_xp >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app.perk_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table app.level_perks (
  id uuid primary key default gen_random_uuid(),
  level integer not null check (level >= 1),
  perk_id uuid not null references app.perk_definitions(id) on delete restrict,
  numeric_value integer,
  metadata jsonb,
  created_at timestamptz not null default now(),
  unique (level, perk_id)
);

create table app.user_perk_unlocks (
  user_id uuid not null references app.users(id) on delete cascade,
  level_perk_id uuid not null references app.level_perks(id) on delete restrict,
  source_level integer not null check (source_level >= 1),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, level_perk_id)
);

create table app.content_moderation_logs (
  id uuid primary key default gen_random_uuid(),
  target_type app.content_moderation_target_type not null,
  target_id uuid not null,
  provider text not null default 'openai',
  flagged boolean not null,
  categories jsonb,
  scores jsonb,
  raw_response jsonb,
  created_at timestamptz not null default now()
);

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

create index pois_location_point_idx on app.pois using gist (location_point);
create index pois_active_campus_idx on app.pois (campus_id, is_active) where deleted_at is null;
create index poi_visits_poi_idx on app.poi_visits (poi_id);
create index billboards_location_point_idx on app.billboards using gist (location_point);
create index billboards_active_idx on app.billboards (campus_id, status, expires_at) where deleted_at is null;
create index billboards_author_day_idx on app.billboards (
  author_id,
  ((timezone('Australia/Sydney', created_at))::date)
);
create index billboard_placements_billboard_idx on app.billboard_placements (billboard_id, z_index);
create index sticker_assets_owner_idx on app.sticker_assets (owner_id);
create index saved_stickers_user_idx on app.saved_stickers (user_id) where deleted_at is null;
create unique index user_quest_progress_unique_idx on app.user_quest_progress (
  user_id,
  source,
  source_id
);
create index user_quest_progress_user_idx on app.user_quest_progress (user_id);

insert into app.campuses (id, name, timezone, center_lat, center_lng, radius_meters, bounds)
values (
  '00000000-0000-4000-8000-000000000100',
  'UNSW Kensington',
  'Australia/Sydney',
  -33.9173,
  151.2313,
  1200,
  '{"north":-33.9095,"south":-33.9249,"east":151.2398,"west":151.2252}'::jsonb
);

insert into app.pois (id, campus_id, title, description, location_point, lat, lng)
values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000100', 'Main Library', 'A busy study landmark near the centre of campus.', st_setsrid(st_makepoint(151.2313, -33.9173), 4326)::geography, -33.9173, 151.2313),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000100', 'Basser Steps', 'A classic meeting spot between upper and lower campus.', st_setsrid(st_makepoint(151.2298, -33.9179), 4326)::geography, -33.9179, 151.2298),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000100', 'Quadrangle Lawn', 'Open green space for quick quest stops.', st_setsrid(st_makepoint(151.2334, -33.9170), 4326)::geography, -33.9170, 151.2334),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000100', 'Red Centre', 'A bright landmark for art, design, and engineering students.', st_setsrid(st_makepoint(151.2306, -33.9161), 4326)::geography, -33.9161, 151.2306),
  ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000100', 'Village Green', 'A broad outdoor hub for lunch breaks and quick meetups.', st_setsrid(st_makepoint(151.2345, -33.9152), 4326)::geography, -33.9152, 151.2345),
  ('00000000-0000-4000-8000-000000000206', '00000000-0000-4000-8000-000000000100', 'Science Theatre', 'A lower-campus lecture landmark with steady student traffic.', st_setsrid(st_makepoint(151.2291, -33.9192), 4326)::geography, -33.9192, 151.2291),
  ('00000000-0000-4000-8000-000000000207', '00000000-0000-4000-8000-000000000100', 'The Roundhouse', 'UNSW live music and events venue (Building E6).', st_setsrid(st_makepoint(151.2315, -33.9183), 4326)::geography, -33.9183, 151.2315);

insert into app.quest_templates (id, key, trigger_type, title_template, description_template, min_target, max_target, xp_reward)
values
  ('00000000-0000-4000-8000-000000000301', 'visit_pois', 'visit_pois', 'Visit {target} new POIs', 'Discover {target} campus landmarks you have not visited before.', 1, 15, 50),
  ('00000000-0000-4000-8000-000000000302', 'leave_billboards', 'leave_billboards', 'Leave {target} billboards', 'Post {target} notes around campus.', 1, 12, 50),
  ('00000000-0000-4000-8000-000000000303', 'place_stickers', 'place_stickers', 'Place {target} stickers', 'Reply to billboards with {target} sticker placements.', 1, 12, 50),
  ('00000000-0000-4000-8000-000000000304', 'receive_replies', 'receive_replies', 'Receive {target} replies', 'Have other students reply to your billboards {target} times.', 1, 10, 75),
  ('00000000-0000-4000-8000-000000000305', 'save_stickers', 'save_stickers', 'Save {target} stickers', 'Save {target} stickers or sticky notes to your collection.', 1, 12, 40),
  -- Demo-day one-tap templates (singular copy, target 1).
  ('00000000-0000-4000-8000-000000000306', 'first_billboard', 'leave_billboards', 'Post your first note', 'Tap a billboard on the map and leave a note for the campus.', 1, 1, 50),
  ('00000000-0000-4000-8000-000000000307', 'first_sticker', 'place_stickers', 'Drop a sticker', 'React to any billboard with a sticker.', 1, 1, 40),
  ('00000000-0000-4000-8000-000000000308', 'first_visit', 'visit_pois', 'Find a hotspot', 'Walk up to any active spot glowing on the map.', 1, 1, 40);

insert into app.level_quest_sets (id, level, template_id, target_count, xp_reward, sort_order)
values
  -- L1 (1 quest) -- demo: one tap -> level up
  ('00000000-0000-4000-8000-000000000501', 1, '00000000-0000-4000-8000-000000000306', 1,  50, 1),

  -- L2 (1 quest) -- demo: one-tap sticker
  ('00000000-0000-4000-8000-000000000502', 2, '00000000-0000-4000-8000-000000000307', 1,  40, 1),

  -- L3 (2 quests)
  ('00000000-0000-4000-8000-000000000504', 3, '00000000-0000-4000-8000-000000000302', 2,  60, 1),
  ('00000000-0000-4000-8000-000000000505', 3, '00000000-0000-4000-8000-000000000305', 1,  40, 2),

  -- L4 (2 quests) -- no receive_replies / visit_pois gates
  ('00000000-0000-4000-8000-000000000506', 4, '00000000-0000-4000-8000-000000000303', 3,  60, 1),
  ('00000000-0000-4000-8000-000000000508', 4, '00000000-0000-4000-8000-000000000305', 2,  90, 3),

  -- L5 (2 quests)
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

insert into app.perk_definitions (id, key, name, description)
values
  ('00000000-0000-4000-8000-000000000800', 'max_concurrent_billboards', 'Concurrent billboards', 'Maximum active billboards a user can maintain.'),
  ('00000000-0000-4000-8000-000000000801', 'daily_billboard_limit', 'Daily billboard limit', 'Billboards a user can post per calendar day.'),
  ('00000000-0000-4000-8000-000000000802', 'sticker_slots', 'Sticker slots', 'Saved sticker and sticky note collection capacity.'),
  ('00000000-0000-4000-8000-000000000803', 'note_signature', 'Note signature', 'Cosmetic signature on notes and stickers.'),
  ('00000000-0000-4000-8000-000000000804', 'note_border_flair', 'Note border flair', 'Cosmetic border treatment for notes.'),
  ('00000000-0000-4000-8000-000000000805', 'palette_expansion', 'Palette expansion', 'Additional sticker colour palette.');

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

insert into app.signatures (id, key, name, asset_base64, streak_day_required) values ('00000000-0000-4000-8000-000000000b01', 'signature_a', 'Sunrise Mark',    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 3);
insert into app.signatures (id, key, name, asset_base64, streak_day_required) values ('00000000-0000-4000-8000-000000000b02', 'signature_b', 'Pixel Bloom',     'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 7);
insert into app.signatures (id, key, name, asset_base64, streak_day_required) values ('00000000-0000-4000-8000-000000000b03', 'signature_c', 'Prestige Cipher', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 30);
