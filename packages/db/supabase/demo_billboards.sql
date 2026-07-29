-- Pins the showcase billboards so the map is never empty.
--
-- Billboards normally expire and get swept by expireBillboards() (see
-- apps/api/src/services/rotations.ts). For a portfolio deployment that means a
-- visitor arriving weeks later sees a blank map. These few boards are given an
-- expiry far enough out that they are effectively permanent; the app renders
-- anything more than 30 days away as "always here" rather than a countdown.
--
-- Idempotent: re-running just re-pins the same rows.
--
-- NOTE: this targets rows that already exist in the live database (their authors
-- are real Clerk-linked users). It is a no-op against a freshly reset DB.

begin;

-- The boards worth showing: real campus coordinates, real placements on them.
update app.billboards
set
  deleted_at = null,
  hidden_at = null,
  status = 'active',
  expires_at = timestamptz '2099-12-31 00:00:00+00',
  empty_expires_at = timestamptz '2099-12-31 00:00:00+00',
  updated_at = now()
where id in (
  'e0972387-17d1-4a38-b9ae-1f0d07c41883',  -- "Sismga sigma"           6 placements
  'da39a165-5ded-43eb-a6ea-64372bfd1f85',  -- "i want food"            6 placements
  '92de94bf-ffb7-44fa-b0fb-e2fe7d59152d',  -- "Starlight!!!!"          2 placements
  '3f13d899-fc74-4984-88ff-cd13e1a9b575',  -- "#1 uni"                 1 placement
  '77716a0e-f64f-4560-9021-5a1f02bfb496'   -- "I love devsoc starlightt"
);

-- Their placements must be visible too, or a pinned board renders bare.
update app.billboard_placements
set deleted_at = null, hidden_at = null, status = 'active', updated_at = now()
where billboard_id in (
  'e0972387-17d1-4a38-b9ae-1f0d07c41883',
  'da39a165-5ded-43eb-a6ea-64372bfd1f85',
  '92de94bf-ffb7-44fa-b0fb-e2fe7d59152d',
  '3f13d899-fc74-4984-88ff-cd13e1a9b575',
  '77716a0e-f64f-4560-9021-5a1f02bfb496'
);

-- And the sticker art those placements point at.
update app.sticker_assets
set deleted_at = null, status = 'active', updated_at = now()
where id in (
  select sticker_asset_id
  from app.billboard_placements
  where sticker_asset_id is not null
    and billboard_id in (
      'e0972387-17d1-4a38-b9ae-1f0d07c41883',
      'da39a165-5ded-43eb-a6ea-64372bfd1f85',
      '92de94bf-ffb7-44fa-b0fb-e2fe7d59152d',
      '3f13d899-fc74-4984-88ff-cd13e1a9b575',
      '77716a0e-f64f-4560-9021-5a1f02bfb496'
    )
);

commit;
