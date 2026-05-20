import {
  createPoiInputSchema,
  getPoiResponseSchema,
  idSchema,
  listPoisResponseSchema,
  updatePoiInputSchema,
  upsertPoiResponseSchema,
  visitPoiInputSchema,
  visitPoiResponseSchema,
} from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { getDb } from "../db";
import { badRequest, notFound } from "../http";
import { getAuthUser, optionalAuth, requireAuth } from "../middleware/auth";
import { incrementQuestProgress, questProgressUpdate } from "../services/progression";
import { isoDate, isoDateTime } from "../serialize";
import type { AppBindings, AuthUser } from "../types";
import { requireAdmin } from "./users";

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

const upsertPoiInputSchema = z.union([createPoiInputSchema, updatePoiInputSchema]);

export const poisRoute = new Hono<AppBindings>();

poisRoute.get("/pois", optionalAuth, async (c) => {
  const db = getDb(c.env);
  const campusId = c.req.query("campusId");
  const authUser = safeAuthUser(c);

  const campus = await loadCampus(db, campusId);
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
      (timezone(${campus.timezone}, now()))::date as "activeOn",
      exists (
        select 1 from app.poi_visits
        where poi_visits.poi_id = pois.id and poi_visits.user_id = ${authUser?.id ?? null}
      ) as visited,
      pois.created_at as "createdAt",
      pois.updated_at as "updatedAt",
      0::int as "visitCount"
    from app.pois
    where
      pois.campus_id = ${campus.id}
      and pois.deleted_at is null
      and pois.is_active
    order by pois.title
  `);

  return c.json(
    listPoisResponseSchema.parse({
      campus: campusResponse(campus),
      pois: rows.map(poiSummary),
    }),
  );
});

poisRoute.get("/pois/:id", optionalAuth, async (c) => {
  const db = getDb(c.env);
  const id = idSchema.safeParse(c.req.param("id"));

  if (!id.success) {
    notFound("POI not found.");
  }

  const poi = await loadPoi(db, id.data, safeAuthUser(c)?.id);

  return c.json(getPoiResponseSchema.parse({ poi: poiDetail(poi) }));
});

poisRoute.post("/pois", requireAuth, zValidator("json", upsertPoiInputSchema), async (c) => {
  const db = getDb(c.env);
  const authUser = getAuthUser(c);
  const input = c.req.valid("json");

  requireAdmin(authUser);

  const rows =
    "id" in input
      ? await db.execute<{ id: string }>(sql`
            update app.pois
            set
              campus_id = coalesce(${input.campusId ?? null}, campus_id),
              title = coalesce(${input.title ?? null}, title),
              description = coalesce(${input.description ?? null}, description),
              picture_base64 = coalesce(${input.pictureBase64 ?? null}, picture_base64),
              lat = coalesce(${input.lat ?? null}, lat),
              lng = coalesce(${input.lng ?? null}, lng),
              location_point = case
                when ${input.lat ?? null}::double precision is not null
                  and ${input.lng ?? null}::double precision is not null
                then st_setsrid(st_makepoint(${input.lng}, ${input.lat}), 4326)::geography
                else location_point
              end,
              radius_meters = coalesce(${input.radiusMeters ?? null}, radius_meters),
              is_active = coalesce(${input.isActive ?? null}, is_active),
              updated_at = now()
            where id = ${input.id}
            returning id
          `)
      : await db.execute<{ id: string }>(sql`
            insert into app.pois (
              campus_id,
              title,
              description,
              picture_base64,
              lat,
              lng,
              location_point,
              radius_meters,
              is_active,
              created_by
            )
            values (
              ${input.campusId},
              ${input.title},
              ${input.description ?? null},
              ${input.pictureBase64 ?? null},
              ${input.lat},
              ${input.lng},
              st_setsrid(st_makepoint(${input.lng}, ${input.lat}), 4326)::geography,
              ${input.radiusMeters},
              ${input.isActive},
              ${authUser.id}
            )
            returning id
          `);
  const row = rows[0];

  if (!row) {
    notFound("POI not found.");
  }

  const poi = await loadPoi(db, row.id, authUser.id);

  return c.json(upsertPoiResponseSchema.parse({ poi: poiDetail(poi) }));
});

poisRoute.post(
  "/pois/:id/visit",
  requireAuth,
  zValidator("json", visitPoiInputSchema),
  async (c) => {
    const db = getDb(c.env);
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
      (timezone(campuses.timezone, now()))::date as "activeOn",
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
