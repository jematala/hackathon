import { createClerkClient, type ClerkClient } from "@clerk/backend";
import { sql } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";

import { getDb, newId, nowSql } from "../db";
import { unauthorized } from "../http";
import type { AppBindings, AuthUser, Env } from "../types";

type ClerkClaims = Record<string, unknown> & {
  email?: string;
  given_name?: string;
  name?: string;
  sub?: string;
  username?: string;
};

type AuthOptions = {
  allowQueryToken?: boolean;
};

let cachedClerkClient: ClerkClient | undefined;
let cachedPublishableKey: string | undefined;
let cachedSecretKey: string | undefined;

function getToken(authorization: string | undefined, queryToken: string | undefined) {
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length);
  }

  return queryToken;
}

function hasAuthMaterial(request: Request, token: string | undefined) {
  return Boolean(token || request.headers.get("cookie"));
}

function clerkClientForEnv(env: Env) {
  if (!env.CLERK_SECRET_KEY || !env.CLERK_PUBLISHABLE_KEY) {
    throw new Error("CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY are not configured.");
  }

  if (
    !cachedClerkClient ||
    cachedSecretKey !== env.CLERK_SECRET_KEY ||
    cachedPublishableKey !== env.CLERK_PUBLISHABLE_KEY
  ) {
    cachedClerkClient = createClerkClient({
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
      secretKey: env.CLERK_SECRET_KEY,
    });
    cachedPublishableKey = env.CLERK_PUBLISHABLE_KEY;
    cachedSecretKey = env.CLERK_SECRET_KEY;
  }

  return cachedClerkClient;
}

function requestWithQueryToken(request: Request, token: string | undefined) {
  if (!token || request.headers.has("authorization")) {
    return request;
  }

  const headers = new Headers(request.headers);
  headers.set("authorization", `Bearer ${token}`);

  return new Request(request, { headers });
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

async function resolveAuthClaims(
  env: Env,
  request: Request,
  token?: string,
): Promise<ClerkClaims | null> {
  const state = await clerkClientForEnv(env).authenticateRequest(
    requestWithQueryToken(request, token),
    {
      acceptsToken: "session_token",
    },
  );

  if (!state.isAuthenticated) {
    return null;
  }

  const auth = state.toAuth();

  if (!auth.userId) {
    return null;
  }

  return {
    ...auth.sessionClaims,
    sub: auth.userId,
  };
}

async function upsertAuthUser(env: Env, payload: ClerkClaims): Promise<AuthUser> {
  if (!payload.sub) {
    unauthorized("Authentication token is missing a subject.");
  }

  const db = getDb(env);
  const rows = await db.execute<AuthUser>(sql`
    insert into users (id, clerk_user_id, username, display_name, is_admin)
    values (
      ${newId()},
      ${payload.sub},
      ${usernameFromClaims(payload)},
      ${displayNameFromClaims(payload)},
      not exists (select 1 from users where deleted_at is null)
    )
    on conflict (clerk_user_id) do update
      set updated_at = ${nowSql()}
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

  await db.execute(sql`
    insert into user_perk_unlocks (user_id, level_perk_id, source_level)
    select ${user.id}, level_perks.id, level_perks.level
    from level_perks
    where
      level_perks.level >= 1
      and level_perks.level <= (select level from users where id = ${user.id})
    on conflict (user_id, level_perk_id) do nothing
  `);

  return {
    ...user,
    isAdmin: Boolean(user.isAdmin),
  };
}

function authMiddleware(options: AuthOptions = {}): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const token = getToken(
      c.req.header("authorization"),
      options.allowQueryToken ? c.req.query("token") : undefined,
    );

    if (!hasAuthMaterial(c.req.raw, token)) {
      unauthorized();
    }

    const payload = await resolveAuthClaims(c.env, c.req.raw, token);

    if (!payload) {
      unauthorized();
    }

    c.set("authUser", await upsertAuthUser(c.env, payload));

    await next();
  };
}

export const requireAuth = authMiddleware();
export const requireRealtimeAuth = authMiddleware({ allowQueryToken: true });

export const optionalAuth: MiddlewareHandler<AppBindings> = async (c, next) => {
  const token = getToken(c.req.header("authorization"), undefined);

  if (!hasAuthMaterial(c.req.raw, token)) {
    await next();
    return;
  }

  const payload = await resolveAuthClaims(c.env, c.req.raw, token);

  if (payload) {
    c.set("authUser", await upsertAuthUser(c.env, payload));
  }

  await next();
};

export function getAuthUser(c: { get: (key: "authUser") => AuthUser }) {
  return c.get("authUser");
}
