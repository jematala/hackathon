drop schema if exists app cascade;
create schema app;

create extension if not exists postgis with schema extensions;

create type app.content_status as enum ('pending', 'active', 'hidden', 'removed', 'rejected');
create type app.placement_kind as enum ('sticker', 'sticky_note');
create type app.saved_sticker_kind as enum ('sticker', 'sticky_note');
create type app.quest_kind as enum ('level', 'daily');
create type app.quest_trigger_type as enum (
  'visit_pois',
  'leave_billboards',
  'place_stickers',
  'receive_replies',
  'save_stickers'
);
create type app.quest_source as enum ('level_quest', 'daily_quest');
create type app.report_target_type as enum ('billboard', 'placement', 'user');
create type app.report_reason as enum ('spam', 'harassment', 'hate', 'sexual', 'violence', 'self_harm', 'other');
create type app.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type app.moderation_action_type as enum ('hide', 'remove', 'warn', 'ban', 'dismiss');
create type app.push_platform as enum ('expo', 'ios', 'android', 'web');

create table app.users (
  id text primary key,
  username text not null unique,
  display_name text not null,
  avatar_base64 text,
  is_admin boolean not null default false,
  level integer not null default 1 check (level >= 1),
  xp integer not null default 0 check (xp >= 0),
  daily_streak integer not null default 0 check (daily_streak >= 0),
  streak_updated_on date,
  last_daily_claimed_on date,
  banned_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app.push_tokens (
  id text primary key,
  user_id text not null references app.users(id) on delete cascade,
  token text not null unique,
  platform app.push_platform not null default 'expo',
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table app.campuses (
  id text primary key,
  name text not null,
  timezone text not null,
  center_lat double precision not null,
  center_lng double precision not null,
  radius_meters integer not null,
  bounds jsonb not null,
  map_provider text not null default 'openstreetmap',
  created_at timestamptz not null default now()
);

create table app.pois (
  id text primary key,
  campus_id text not null references app.campuses(id) on delete cascade,
  title text not null,
  description text,
  picture_base64 text,
  location_point geography(point, 4326) not null,
  lat double precision not null,
  lng double precision not null,
  radius_meters integer not null default 30 check (radius_meters > 0),
  is_active boolean not null default true,
  created_by text references app.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table app.poi_daily_activations (
  campus_id text not null references app.campuses(id) on delete cascade,
  poi_id text not null references app.pois(id) on delete cascade,
  active_on date not null,
  created_at timestamptz not null default now(),
  primary key (campus_id, poi_id, active_on)
);

create table app.poi_visits (
  user_id text not null references app.users(id) on delete cascade,
  poi_id text not null references app.pois(id) on delete cascade,
  visited_at timestamptz not null default now(),
  visited_on date not null default current_date,
  primary key (user_id, poi_id)
);

create table app.billboards (
  id text primary key,
  campus_id text not null references app.campuses(id) on delete cascade,
  author_id text not null references app.users(id) on delete cascade,
  body text not null,
  location_point geography(point, 4326) not null,
  lat double precision not null,
  lng double precision not null,
  status app.content_status not null default 'pending',
  moderation_summary jsonb,
  created_on date not null default current_date,
  expires_at timestamptz not null,
  hidden_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app.sticker_assets (
  id text primary key,
  owner_id text not null references app.users(id) on delete cascade,
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
  id text primary key,
  billboard_id text not null references app.billboards(id) on delete cascade,
  author_id text not null references app.users(id) on delete cascade,
  kind app.placement_kind not null,
  x double precision not null check (x >= 0 and x <= 1),
  y double precision not null check (y >= 0 and y <= 1),
  z_index integer not null default 0,
  sticker_asset_id text references app.sticker_assets(id) on delete set null,
  body text,
  status app.content_status not null default 'pending',
  moderation_summary jsonb,
  hidden_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (billboard_id, author_id)
);

create table app.saved_stickers (
  id text primary key,
  user_id text not null references app.users(id) on delete cascade,
  kind app.saved_sticker_kind not null,
  sticker_asset_id text references app.sticker_assets(id) on delete cascade,
  body text,
  label text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table app.quest_templates (
  id text primary key,
  key text not null unique,
  kind app.quest_kind not null,
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
  id text primary key,
  level integer not null check (level >= 1),
  template_id text not null references app.quest_templates(id) on delete restrict,
  target_count integer not null check (target_count > 0),
  xp_reward integer not null check (xp_reward >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (level, sort_order)
);

create table app.daily_quest_pool (
  id text primary key,
  template_id text not null references app.quest_templates(id) on delete restrict,
  target_count integer not null check (target_count > 0),
  xp_reward integer not null check (xp_reward >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table app.daily_quest_assignments (
  id text primary key,
  campus_id text not null references app.campuses(id) on delete cascade,
  active_on date not null,
  daily_quest_pool_id text not null references app.daily_quest_pool(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (campus_id, active_on)
);

create table app.user_quest_progress (
  id text primary key,
  user_id text not null references app.users(id) on delete cascade,
  source app.quest_source not null,
  source_id text not null,
  progress_count integer not null default 0 check (progress_count >= 0),
  target_count integer not null check (target_count > 0),
  completed_at timestamptz,
  claimable_at timestamptz,
  claimed_at timestamptz,
  claimed_xp integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, source_id)
);

create table app.perk_definitions (
  id text primary key,
  key text not null unique,
  name text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table app.level_perks (
  id text primary key,
  level integer not null check (level >= 1),
  perk_id text not null references app.perk_definitions(id) on delete restrict,
  numeric_value integer,
  metadata jsonb,
  created_at timestamptz not null default now(),
  unique (level, perk_id)
);

create table app.user_perk_unlocks (
  user_id text not null references app.users(id) on delete cascade,
  perk_id text not null references app.perk_definitions(id) on delete restrict,
  source_level integer not null check (source_level >= 1),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, perk_id)
);

create table app.streak_reward_definitions (
  id text primary key,
  streak_days integer not null unique check (streak_days > 0),
  name text not null,
  reward jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table app.reports (
  id text primary key,
  reporter_id text not null references app.users(id) on delete cascade,
  target_type app.report_target_type not null,
  target_id text not null,
  reason app.report_reason not null,
  details text,
  status app.report_status not null default 'open',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create table app.moderation_actions (
  id text primary key,
  report_id text references app.reports(id) on delete set null,
  admin_id text not null references app.users(id) on delete restrict,
  action app.moderation_action_type not null,
  target_type app.report_target_type not null,
  target_id text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table app.content_moderation_logs (
  id text primary key,
  target_type app.report_target_type not null,
  target_id text not null,
  provider text not null default 'openai',
  flagged boolean not null,
  categories jsonb,
  scores jsonb,
  raw_response jsonb,
  created_at timestamptz not null default now()
);

create index pois_location_point_idx on app.pois using gist (location_point);
create index pois_active_campus_idx on app.pois (campus_id, is_active) where deleted_at is null;
create index poi_visits_poi_idx on app.poi_visits (poi_id);
create index billboards_location_point_idx on app.billboards using gist (location_point);
create index billboards_active_idx on app.billboards (campus_id, status, expires_at) where deleted_at is null;
create index billboards_author_day_idx on app.billboards (author_id, created_on);
create index billboard_placements_billboard_idx on app.billboard_placements (billboard_id, z_index);
create index sticker_assets_owner_idx on app.sticker_assets (owner_id);
create index saved_stickers_user_idx on app.saved_stickers (user_id) where deleted_at is null;
create index user_quest_progress_user_idx on app.user_quest_progress (user_id);
create index reports_status_idx on app.reports (status, created_at);

insert into app.users (id, username, display_name, avatar_base64, is_admin)
values
  ('demo-admin', 'admin', 'Demo Admin', null, true),
  ('demo-user', 'bluewren', 'Blue Wren', null, false);

insert into app.campuses (id, name, timezone, center_lat, center_lng, radius_meters, bounds)
values (
  'unsw-kensington',
  'UNSW Kensington',
  'Australia/Sydney',
  -33.9173,
  151.2313,
  1200,
  '{"north":-33.9095,"south":-33.9249,"east":151.2398,"west":151.2252}'::jsonb
);

insert into app.pois (id, campus_id, title, description, location_point, lat, lng, created_by)
values
  ('poi-main-library', 'unsw-kensington', 'Main Library', 'A busy study landmark near the centre of campus.', st_setsrid(st_makepoint(151.2313, -33.9173), 4326)::geography, -33.9173, 151.2313, 'demo-admin'),
  ('poi-basser-steps', 'unsw-kensington', 'Basser Steps', 'A classic meeting spot between upper and lower campus.', st_setsrid(st_makepoint(151.2298, -33.9179), 4326)::geography, -33.9179, 151.2298, 'demo-admin'),
  ('poi-quadrangle', 'unsw-kensington', 'Quadrangle Lawn', 'Open green space for quick quest stops.', st_setsrid(st_makepoint(151.2334, -33.9170), 4326)::geography, -33.9170, 151.2334, 'demo-admin');

insert into app.poi_daily_activations (campus_id, poi_id, active_on)
select 'unsw-kensington', id, current_date
from app.pois;

insert into app.quest_templates (id, key, kind, trigger_type, title_template, description_template, min_target, max_target, xp_reward)
values
  ('qt-visit-pois', 'visit_pois', 'level', 'visit_pois', 'Visit {target} new POIs', 'Discover {target} campus landmarks you have not visited before.', 1, 5, 50),
  ('qt-leave-billboards', 'leave_billboards', 'level', 'leave_billboards', 'Leave {target} billboards', 'Post {target} notes around campus.', 1, 5, 50),
  ('qt-place-stickers', 'place_stickers', 'level', 'place_stickers', 'Place {target} stickers', 'Reply to billboards with {target} sticker placements.', 1, 6, 50),
  ('qt-receive-replies', 'receive_replies', 'level', 'receive_replies', 'Receive {target} replies', 'Have other students reply to your billboards {target} times.', 1, 5, 75),
  ('qt-save-stickers', 'save_stickers', 'level', 'save_stickers', 'Save {target} stickers', 'Save {target} stickers or sticky notes to your collection.', 1, 4, 40),
  ('qt-daily-explorer', 'daily_explorer', 'daily', 'visit_pois', 'Daily wander', 'Visit {target} active POIs today.', 1, 3, 30);

insert into app.level_quest_sets (id, level, template_id, target_count, xp_reward, sort_order)
values
  ('lq-1-visit', 1, 'qt-visit-pois', 1, 40, 1),
  ('lq-1-note', 1, 'qt-leave-billboards', 1, 40, 2),
  ('lq-2-sticker', 2, 'qt-place-stickers', 2, 60, 1),
  ('lq-2-save', 2, 'qt-save-stickers', 1, 40, 2),
  ('lq-3-replies', 3, 'qt-receive-replies', 2, 80, 1);

insert into app.daily_quest_pool (id, template_id, target_count, xp_reward)
values
  ('dq-visit-one', 'qt-daily-explorer', 1, 25),
  ('dq-visit-two', 'qt-daily-explorer', 2, 35),
  ('dq-note-one', 'qt-leave-billboards', 1, 25),
  ('dq-sticker-two', 'qt-place-stickers', 2, 30),
  ('dq-save-one', 'qt-save-stickers', 1, 25);

insert into app.daily_quest_assignments (id, campus_id, active_on, daily_quest_pool_id)
values ('dqa-unsw-today', 'unsw-kensington', current_date, 'dq-visit-one');

insert into app.perk_definitions (id, key, name, description)
values
  ('perk-max-concurrent-billboards', 'max_concurrent_billboards', 'Concurrent billboards', 'Maximum active billboards a user can maintain.'),
  ('perk-daily-billboard-limit', 'daily_billboard_limit', 'Daily billboard limit', 'Maximum billboards a user can post per calendar day.'),
  ('perk-sticker-slots', 'sticker_slots', 'Sticker slots', 'Saved sticker and sticky note collection capacity.'),
  ('perk-note-signature', 'note_signature', 'Note signature', 'Cosmetic signature on notes and stickers.'),
  ('perk-note-border-flair', 'note_border_flair', 'Note border flair', 'Cosmetic border treatment for notes.'),
  ('perk-palette-expansion', 'palette_expansion', 'Palette expansion', 'Additional sticker colour palette.');

insert into app.level_perks (id, level, perk_id, numeric_value, metadata)
values
  ('lp-1-notes', 1, 'perk-max-concurrent-billboards', 3, null),
  ('lp-1-daily', 1, 'perk-daily-billboard-limit', 10, null),
  ('lp-1-slots', 1, 'perk-sticker-slots', 10, null),
  ('lp-2-notes', 2, 'perk-max-concurrent-billboards', 4, null),
  ('lp-3-slots', 3, 'perk-sticker-slots', 12, null),
  ('lp-4-signature', 4, 'perk-note-signature', null, '{"enabled":true}'::jsonb),
  ('lp-5-notes', 5, 'perk-max-concurrent-billboards', 5, null),
  ('lp-6-border', 6, 'perk-note-border-flair', null, '{"enabled":true}'::jsonb),
  ('lp-7-slots', 7, 'perk-sticker-slots', 14, null),
  ('lp-8-notes', 8, 'perk-max-concurrent-billboards', 6, null),
  ('lp-9-palette', 9, 'perk-palette-expansion', null, '{"palette":"extended"}'::jsonb),
  ('lp-10-notes', 10, 'perk-max-concurrent-billboards', 10, null),
  ('lp-10-slots', 10, 'perk-sticker-slots', 20, null);

insert into app.streak_reward_definitions (id, streak_days, name, reward)
values
  ('streak-3', 3, 'Three day trail', '{"xpMultiplier":1.1}'::jsonb),
  ('streak-7', 7, 'Weekly wanderer', '{"cosmetic":"leaf_badge"}'::jsonb);
