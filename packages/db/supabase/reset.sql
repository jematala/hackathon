drop schema if exists app cascade;
create schema app;

create extension if not exists postgis with schema extensions;

create table app.users (
  id text primary key,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table app.events (
  id text primary key,
  title text not null,
  description text,
  location_name text,
  location_point geography(point, 4326),
  starts_at timestamptz not null,
  created_by text not null references app.users(id),
  created_at timestamptz not null default now()
);

create table app.event_attendees (
  event_id text not null references app.events(id) on delete cascade,
  user_id text not null references app.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index events_location_point_idx on app.events using gist (location_point);
create index events_starts_at_idx on app.events (starts_at);

insert into app.users (id, display_name)
values ('demo-user', 'Demo User');

insert into app.events (
  id,
  title,
  description,
  location_name,
  location_point,
  starts_at,
  created_by
)
values (
  'demo-event',
  'Campus meetup',
  'Temporary PostGIS-backed event seed.',
  'UNSW Library',
  st_setsrid(st_makepoint(151.2313, -33.9173), 4326)::geography,
  '2026-05-18T09:00:00Z',
  'demo-user'
);
