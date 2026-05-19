import { sql } from "drizzle-orm";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { MiddlewareHandler } from "hono";

import { getDb } from "../db";
import { unauthorized } from "../http";
import type { AppBindings, AuthUser, Env } from "../types";

let cachedJwksUrl: string | undefined;
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getToken(authorization: string | undefined, queryToken: string | undefined) {
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length);
  }

  return queryToken;
}

function jwksForEnv(env: Env) {
  const jwksUrl =
    env.CLERK_JWKS_URL ??
    (env.CLERK_ISSUER ? `${env.CLERK_ISSUER}/.well-known/jwks.json` : undefined);

  if (!jwksUrl) {
    throw new Error("CLERK_JWKS_URL or CLERK_ISSUER is not configured.");
  }

  if (!cachedJwks || cachedJwksUrl !== jwksUrl) {
    cachedJwks = createRemoteJWKSet(new URL(jwksUrl));
    cachedJwksUrl = jwksUrl;
  }

  return cachedJwks;
}

function usernameFromClaims(payload: JWTPayload) {
  const raw =
    (typeof payload.username === "string" && payload.username) ||
    (typeof payload.email === "string" && payload.email.split("@")[0]) ||
    (typeof payload.sub === "string" && payload.sub) ||
    "student";
  const clean = raw
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 24);
  const suffix = String(payload.sub ?? "user")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-6);

  return `${clean || "student"}_${suffix}`.slice(0, 32);
}

function displayNameFromClaims(payload: JWTPayload) {
  if (typeof payload.name === "string" && payload.name.trim()) {
    return payload.name.trim().slice(0, 80);
  }

  if (typeof payload.given_name === "string" && payload.given_name.trim()) {
    return payload.given_name.trim().slice(0, 80);
  }

  return usernameFromClaims(payload);
}

async function verifyAuth(env: Env, token: string): Promise<JWTPayload> {
  const verified = await jwtVerify(token, jwksForEnv(env), {
    issuer: env.CLERK_ISSUER,
  });

  return verified.payload;
}

async function upsertAuthUser(env: Env, payload: JWTPayload): Promise<AuthUser> {
  if (!payload.sub) {
    unauthorized("Authentication token is missing a subject.");
  }

  const db = getDb(env);
  const rows = await db.execute<AuthUser>(sql`
    insert into app.users (clerk_user_id, username, display_name)
    values (${payload.sub}, ${usernameFromClaims(payload)}, ${displayNameFromClaims(payload)})
    on conflict (clerk_user_id) do update
      set updated_at = now()
    returning
      id,
      clerk_user_id as "clerkUserId",
      username,
      display_name as "displayName",
      is_admin as "isAdmin"
  `);

  const user = rows[0];
  if (!user) {
    throw new Error("Failed to resolve authenticated user.");
  }

  return user;
}

async function loadDevAuthUser(env: Env, userId: string): Promise<AuthUser> {
  const db = getDb(env);
  const rows = await db.execute<AuthUser>(sql`
    select
      id,
      clerk_user_id as "clerkUserId",
      username,
      display_name as "displayName",
      is_admin as "isAdmin"
    from app.users
    where id = ${userId} and deleted_at is null
  `);

  const user = rows[0];
  if (!user) {
    unauthorized("DEV_AUTH_USER_ID does not match an existing user.");
  }

  return user;
}

function devUserId(env: Env, token: string): string | null {
  if (token !== "dev") return null;
  return env.DEV_AUTH_USER_ID ?? null;
}

export const requireAuth: MiddlewareHandler<AppBindings> = async (c, next) => {
  const token = getToken(c.req.header("authorization"), c.req.query("token"));

  if (!token) {
    unauthorized();
  }

  const devId = devUserId(c.env, token);
  if (devId) {
    c.set("authUser", await loadDevAuthUser(c.env, devId));
    await next();
    return;
  }

  const payload = await verifyAuth(c.env, token);
  c.set("authUser", await upsertAuthUser(c.env, payload));

  await next();
};

export const optionalAuth: MiddlewareHandler<AppBindings> = async (c, next) => {
  const token = getToken(c.req.header("authorization"), c.req.query("token"));

  if (token) {
    const devId = devUserId(c.env, token);
    if (devId) {
      c.set("authUser", await loadDevAuthUser(c.env, devId));
    } else {
      const payload = await verifyAuth(c.env, token);
      c.set("authUser", await upsertAuthUser(c.env, payload));
    }
  }

  await next();
};

export function getAuthUser(c: { get: (key: "authUser") => AuthUser }) {
  return c.get("authUser");
}
