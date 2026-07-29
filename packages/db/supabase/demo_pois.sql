-- Demo-day POI seed. Idempotent + non-destructive.
-- Seeds the campus + 6 POIs, then opens the visit radius so `visit_pois` quests
-- complete from ANY location (the map's POIs become tappable-to-visit anywhere).
-- ponytail: giant radius is a demo hack -- revert to 30m for real geofencing.

insert into app.campuses (id, name, timezone, center_lat, center_lng, radius_meters, bounds)
values (
  '00000000-0000-4000-8000-000000000100',
  'UNSW Kensington', 'Australia/Sydney', -33.9173, 151.2313, 1200,
  '{"north":-33.9095,"south":-33.9249,"east":151.2398,"west":151.2252}'::jsonb
)
on conflict (id) do nothing;

insert into app.pois (id, campus_id, title, description, location_point, lat, lng)
values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000100', 'Main Library', 'A busy study landmark near the centre of campus.', st_setsrid(st_makepoint(151.2313, -33.9173), 4326)::geography, -33.9173, 151.2313),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000100', 'Basser Steps', 'A classic meeting spot between upper and lower campus.', st_setsrid(st_makepoint(151.2298, -33.9179), 4326)::geography, -33.9179, 151.2298),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000100', 'Quadrangle Lawn', 'Open green space for quick quest stops.', st_setsrid(st_makepoint(151.2334, -33.9170), 4326)::geography, -33.9170, 151.2334),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000100', 'Red Centre', 'A bright landmark for art, design, and engineering students.', st_setsrid(st_makepoint(151.2306, -33.9161), 4326)::geography, -33.9161, 151.2306),
  ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000100', 'Village Green', 'A broad outdoor hub for lunch breaks and quick meetups.', st_setsrid(st_makepoint(151.2345, -33.9152), 4326)::geography, -33.9152, 151.2345),
  ('00000000-0000-4000-8000-000000000206', '00000000-0000-4000-8000-000000000100', 'Science Theatre', 'A lower-campus lecture landmark with steady student traffic.', st_setsrid(st_makepoint(151.2291, -33.9192), 4326)::geography, -33.9192, 151.2291)
on conflict (id) do nothing;

-- Demo: any GPS reading counts as "at the POI" (20,000 km radius).
update app.pois set radius_meters = 20000000, is_active = true, deleted_at = null;
