import {
  getPoiResponseSchema,
  idSchema,
  listPoisResponseSchema,
  visitPoiInputSchema,
  visitPoiResponseSchema,
} from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { sql } from "drizzle-orm";
import { Hono } from "hono";

import type { getDb } from "../db";
import { badRequest, notFound } from "../http";
import { getAuthUser, optionalAuth, requireAuth } from "../middleware/auth";
import { incrementQuestProgress, questProgressUpdate } from "../services/progression";
import { isoDate, isoDateTime } from "../serialize";
import type { AppBindings, AuthUser } from "../types";

type CampusRow = {
  bounds: { east: number; north: number; south: number; west: number };
  centerLat: number;
  centerLng: number;
  id: string;
  mapProvider: "openstreetmap";
  name: string;
  radiusMeters: number;
  timezone: string;
};

type PoiRow = {
  activeOn: Date | string | null;
  campusId: string;
  createdAt: Date | string;
  description: string | null;
  id: string;
  isActive: boolean;
  lat: number;
  lng: number;
  pictureBase64: string | null;
  radiusMeters: number;
  title: string;
  updatedAt: Date | string;
  visited: boolean;
  visitCount: number;
};

export const poisRoute = new Hono<AppBindings>();

poisRoute.get("/pois", optionalAuth, async (c) => {
  const db = c.var.db;
  const campusId = c.req.query("campusId");
  const authUser = safeAuthUser(c);

  // Rotations are maintained by the 30-minute cron (see index.ts scheduled), not
  // on the read path — it turned every GET into a read-write transaction.
  //
  // Both statements are independent (the list query resolves the campus itself),
  // so they share one round trip instead of two.
  const [campus, rows] = await Promise.all([
    loadCampus(db, campusId),
    db.execute<PoiRow>(sql`
    with campus as (
      select id, timezone
      from app.campuses
      where ${campusId ? sql`id = ${campusId}` : sql`true`}
      order by created_at
      limit 1
    )
    select
      pois.id,
      pois.campus_id as "campusId",
      pois.title,
      pois.description,
      pois.picture_base64 as "pictureBase64",
      pois.lat,
      pois.lng,
      pois.radius_meters as "radiusMeters",
      pois.is_active as "isActive",
      poi_daily_activations.active_on as "activeOn",
      exists (
        select 1 from app.poi_visits
        where poi_visits.poi_id = pois.id and poi_visits.user_id = ${authUser?.id ?? null}
      ) as visited,
      pois.created_at as "createdAt",
      pois.updated_at as "updatedAt",
      0::int as "visitCount"
    from campus
    join app.pois on pois.campus_id = campus.id
    join app.poi_daily_activations
      on poi_daily_activations.poi_id = pois.id
      and poi_daily_activations.campus_id = pois.campus_id
      and poi_daily_activations.active_on = (timezone(campus.timezone, now()))::date
    where pois.deleted_at is null and pois.is_active
    order by pois.title
  `),
  ]);

  return c.json(
    listPoisResponseSchema.parse({
      campus: campusResponse(campus),
      pois: rows.map(poiSummary),
    }),
  );
});

poisRoute.get("/pois/:id", optionalAuth, async (c) => {
  const db = c.var.db;
  const id = idSchema.safeParse(c.req.param("id"));

  if (!id.success) {
    notFound("POI not found.");
  }

  const poi = await loadPoi(db, id.data, safeAuthUser(c)?.id);

  return c.json(getPoiResponseSchema.parse({ poi: poiDetail(poi) }));
});

poisRoute.post(
  "/pois/:id/visit",
  requireAuth,
  zValidator("json", visitPoiInputSchema),
  async (c) => {
    const db = c.var.db;
    const input = c.req.valid("json");
    const authUser = getAuthUser(c);
    const id = idSchema.safeParse(c.req.param("id"));

    if (!id.success) {
      notFound("POI not found.");
    }

    const rows = await db.execute<{
      campusId: string;
      radiusMeters: number;
      visitedAt: Date | string;
      withinRadius: boolean;
    }>(sql`
      select
        campus_id as "campusId",
        radius_meters as "radiusMeters",
        now() as "visitedAt",
        st_dwithin(
          location_point,
          st_setsrid(st_makepoint(${input.lng}, ${input.lat}), 4326)::geography,
          radius_meters
        ) as "withinRadius"
      from app.pois
      where id = ${id.data} and deleted_at is null and is_active
    `);
    const poi = rows[0];

    if (!poi) {
      notFound("POI not found.");
    }

    if (!poi.withinRadius) {
      return c.json(
        visitPoiResponseSchema.parse({
          firstVisit: false,
          poiId: id.data,
          questProgress: [],
          visitedAt: isoDateTime(poi.visitedAt),
          withinRadius: false,
        }),
      );
    }

    const insertRows = await db.execute<{ inserted: boolean; visitedAt: Date | string }>(sql`
      insert into app.poi_visits (user_id, poi_id)
      values (${authUser.id}, ${id.data})
      on conflict (user_id, poi_id) do nothing
      returning true as inserted, visited_at as "visitedAt"
    `);
    const firstVisit = Boolean(insertRows[0]?.inserted);
    const progress = firstVisit
      ? (await incrementQuestProgress(db, authUser.id, "visit_pois")).map(questProgressUpdate)
      : [];

    return c.json(
      visitPoiResponseSchema.parse({
        firstVisit,
        poiId: id.data,
        questProgress: progress,
        visitedAt: isoDateTime(insertRows[0]?.visitedAt ?? poi.visitedAt),
        withinRadius: true,
      }),
    );
  },
);

async function loadCampus(db: ReturnType<typeof getDb>, campusId: string | undefined) {
  const id = campusId ? idSchema.safeParse(campusId) : undefined;

  if (campusId && !id?.success) {
    badRequest("Invalid campusId.");
  }

  const rows = await db.execute<CampusRow>(sql`
    select
      id,
      name,
      timezone,
      center_lat as "centerLat",
      center_lng as "centerLng",
      radius_meters as "radiusMeters",
      bounds,
      map_provider as "mapProvider"
    from app.campuses
    where ${campusId ? sql`id = ${campusId}` : sql`true`}
    order by created_at
    limit 1
  `);
  const campus = rows[0];

  if (!campus) {
    notFound("Campus not found.");
  }

  return campus;
}

async function loadPoi(db: ReturnType<typeof getDb>, id: string, userId: string | undefined) {
  const rows = await db.execute<PoiRow>(sql`
    select
      pois.id,
      pois.campus_id as "campusId",
      pois.title,
      pois.description,
      pois.picture_base64 as "pictureBase64",
      pois.lat,
      pois.lng,
      pois.radius_meters as "radiusMeters",
      pois.is_active as "isActive",
      poi_daily_activations.active_on as "activeOn",
      exists (
        select 1 from app.poi_visits
        where poi_visits.poi_id = pois.id and poi_visits.user_id = ${userId ?? null}
      ) as visited,
      pois.created_at as "createdAt",
      pois.updated_at as "updatedAt",
      (
        select count(*)::int from app.poi_visits where poi_visits.poi_id = pois.id
      ) as "visitCount"
    from app.pois
    left join app.campuses on campuses.id = pois.campus_id
    left join app.poi_daily_activations
      on poi_daily_activations.poi_id = pois.id
      and poi_daily_activations.campus_id = pois.campus_id
      and poi_daily_activations.active_on = (timezone(campuses.timezone, now()))::date
    where pois.id = ${id} and pois.deleted_at is null
  `);
  const poi = rows[0];

  if (!poi) {
    notFound("POI not found.");
  }

  return poi;
}

function campusResponse(row: CampusRow) {
  return {
    bounds: row.bounds,
    center: {
      lat: row.centerLat,
      lng: row.centerLng,
    },
    id: row.id,
    mapProvider: row.mapProvider,
    name: row.name,
    radiusMeters: row.radiusMeters,
    timezone: row.timezone,
  };
}

function poiSummary(row: PoiRow) {
  return {
    activeOn: row.activeOn ? isoDate(row.activeOn) : null,
    campusId: row.campusId,
    description: row.description,
    id: row.id,
    isActive: row.isActive,
    lat: row.lat,
    lng: row.lng,
    pictureBase64: row.pictureBase64,
    radiusMeters: row.radiusMeters,
    title: row.title,
    visited: row.visited,
  };
}

function poiDetail(row: PoiRow) {
  return {
    ...poiSummary(row),
    createdAt: isoDateTime(row.createdAt),
    updatedAt: isoDateTime(row.updatedAt),
    visitCount: row.visitCount,
  };
}

function safeAuthUser(c: { var: { authUser?: AuthUser } }) {
  return c.var.authUser;
}
