import { sql } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

import { getDb } from "../db";
import { unauthorized } from "../http";
import type { AppBindings, AuthUser, Env } from "../types";

type ClerkClaims = JWTPayload & {
  email?: string;
  given_name?: string;
  name?: string;
  username?: string;
};

type AuthOptions = {
  allowQueryToken?: boolean;
  resolveUser?: boolean;
};

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | undefined;
let cachedJwksUrl: string | undefined;

function getAuthorizationToken(authorization: string | undefined) {
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length);
  }

  return undefined;
}

function getCookieToken(request: Request) {
  const cookie = request.headers.get("cookie");
  if (!cookie) {
    return undefined;
  }

  for (const pair of cookie.split(";")) {
    const [rawName, ...rawValue] = pair.trim().split("=");
    if (rawName === "__session") {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return undefined;
}

function getToken(request: Request, queryToken: string | undefined) {
  return (
    getAuthorizationToken(request.headers.get("authorization") ?? undefined) ??
    queryToken ??
    getCookieToken(request)
  );
}

function hasAuthMaterial(token: string | undefined) {
  return Boolean(token);
}

function decodePublishableKey(publishableKey: string) {
  const match = publishableKey.match(/^pk_(?:test|live)_(.+)$/);
  if (!match) {
    throw new Error("CLERK_PUBLISHABLE_KEY is not a valid Clerk publishable key.");
  }

  const encoded = match[1];
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded).split("$")[0];
}

function clerkIssuerFromPublishableKey(publishableKey: string) {
  const frontendApi = decodePublishableKey(publishableKey);
  const baseUrl =
    frontendApi.startsWith("http://") || frontendApi.startsWith("https://")
      ? frontendApi
      : `https://${frontendApi}`;

  return new URL(baseUrl).origin;
}

function authConfigForEnv(env: Env) {
  if (!env.CLERK_PUBLISHABLE_KEY) {
    throw new Error("CLERK_PUBLISHABLE_KEY is not configured.");
  }

  const issuer = clerkIssuerFromPublishableKey(env.CLERK_PUBLISHABLE_KEY);
  const jwksUrl =
    env.CLERK_JWKS_URL?.trim() || new URL("/.well-known/jwks.json", issuer).toString();

  let jwks = cachedJwks;
  if (!jwks || cachedJwksUrl !== jwksUrl) {
    jwks = createRemoteJWKSet(new URL(jwksUrl));
    cachedJwks = jwks;
    cachedJwksUrl = jwksUrl;
  }

  return { issuer, jwks };
}

function usernameFromClaims(payload: ClerkClaims) {
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

function displayNameFromClaims(payload: ClerkClaims) {
  if (typeof payload.name === "string" && payload.name.trim()) {
    return payload.name.trim().slice(0, 80);
  }

  if (typeof payload.given_name === "string" && payload.given_name.trim()) {
    return payload.given_name.trim().slice(0, 80);
  }

  return usernameFromClaims(payload);
}

async function resolveAuthClaims(env: Env, token: string | undefined): Promise<ClerkClaims | null> {
  if (!token) {
    return null;
  }

  const { issuer, jwks } = authConfigForEnv(env);
  const { payload } = await jwtVerify(token, jwks, {
    algorithms: ["RS256"],
    issuer,
  }).catch(() => ({ payload: null }));

  if (!payload?.sub) {
    return null;
  }

  return payload as ClerkClaims;
}

async function upsertAuthUser(env: Env, payload: ClerkClaims): Promise<AuthUser> {
  if (!payload.sub) {
    unauthorized("Authentication token is missing a subject.");
  }

  const db = getDb(env);
  const rows = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(74291013)`);

    return tx.execute<AuthUser>(sql`
      insert into app.users (clerk_user_id, username, display_name, is_admin)
      values (
        ${payload.sub},
        ${usernameFromClaims(payload)},
        ${displayNameFromClaims(payload)},
        not exists (select 1 from app.users where deleted_at is null)
      )
      on conflict (clerk_user_id) do update
        set updated_at = now()
      returning
        id,
        clerk_user_id as "clerkUserId",
        username,
        display_name as "displayName",
        is_admin as "isAdmin"
    `);
  });

  const user = rows[0];
  if (!user) {
    throw new Error("Failed to resolve authenticated user.");
  }

  await db.execute(sql`
    insert into app.user_perk_unlocks (user_id, level_perk_id, source_level)
    select ${user.id}, level_perks.id, level_perks.level
    from app.level_perks
    where level_perks.level <= (select level from app.users where id = ${user.id})
    on conflict (user_id, level_perk_id) do nothing
  `);

  return user;
}

function authMiddleware({
  allowQueryToken = false,
  resolveUser = true,
}: AuthOptions = {}): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const token = getToken(c.req.raw, allowQueryToken ? c.req.query("token") : undefined);

    if (!hasAuthMaterial(token)) {
      unauthorized();
    }

    const payload = await resolveAuthClaims(c.env, token);

    if (!payload) {
      unauthorized();
    }

    if (resolveUser) {
      c.set("authUser", await upsertAuthUser(c.env, payload));
    }

    await next();
  };
}

export const requireAuth = authMiddleware();
export const requireRealtimeAuth = authMiddleware({ allowQueryToken: true, resolveUser: false });

export const optionalAuth: MiddlewareHandler<AppBindings> = async (c, next) => {
  const token = getToken(c.req.raw, undefined);

  if (!hasAuthMaterial(token)) {
    await next();
    return;
  }

  const payload = await resolveAuthClaims(c.env, token);

  if (payload) {
    c.set("authUser", await upsertAuthUser(c.env, payload));
  }

  await next();
};

export function getAuthUser(c: { get: (key: "authUser") => AuthUser }) {
  return c.get("authUser");
}
