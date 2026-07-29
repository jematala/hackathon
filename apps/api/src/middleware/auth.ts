import { createClerkClient, type ClerkClient } from "@clerk/backend";
import { sql } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";

import type { getDb } from "../db";
import { unauthorized } from "../http";
import type { AppBindings, AuthUser, Env } from "../types";

type Database = ReturnType<typeof getDb>;

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

function primaryEmail(user: {
  emailAddresses: { id: string; emailAddress: string }[];
  primaryEmailAddressId: string | null;
}) {
  return (
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
    user.emailAddresses[0]?.emailAddress
  );
}

// The session token often lacks username/name claims, so a freshly-inserted row
// falls back to the raw Clerk id. Read the real profile from Clerk once, at insert.
async function enrichUserFromClerk(db: Database, env: Env, userId: string, clerkUserId: string) {
  try {
    const clerkUser = await clerkClientForEnv(env).users.getUser(clerkUserId);
    const email = primaryEmail(clerkUser);
    const username = (clerkUser.username || email?.split("@")[0] || clerkUser.firstName || "")
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 32);
    const displayName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim();

    if (!username) return null;

    const rows = await db.execute<{ username: string; displayName: string }>(sql`
      update app.users
      set username = ${username},
          display_name = ${displayName || username},
          updated_at = now()
      where id = ${userId}
      returning username, display_name as "displayName"
    `);
    return rows[0] ?? null;
  } catch {
    // Unique-username clash or Clerk hiccup: keep the fallback, never block auth.
    return null;
  }
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

async function upsertAuthUser(db: Database, env: Env, payload: ClerkClaims): Promise<AuthUser> {
  if (!payload.sub) {
    unauthorized("Authentication token is missing a subject.");
  }

  // Fast path: known user. Skips the advisory-locked transaction + writes that
  // previously ran on EVERY authenticated request and serialized all traffic.
  const existing = await db.execute<AuthUser>(sql`
    select
      id,
      clerk_user_id as "clerkUserId",
      username,
      display_name as "displayName",
      is_admin as "isAdmin"
    from app.users
    where clerk_user_id = ${payload.sub}
  `);

  if (existing[0]) {
    return existing[0];
  }

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
        is_admin as "isAdmin",
        (xmax = 0) as "inserted"
    `);
  });

  const user = rows[0];
  if (!user) {
    throw new Error("Failed to resolve authenticated user.");
  }

  if ((user as AuthUser & { inserted?: boolean }).inserted) {
    const enriched = await enrichUserFromClerk(db, env, user.id, user.clerkUserId);
    if (enriched) {
      user.username = enriched.username;
      user.displayName = enriched.displayName;
    }
  }

  // Level-1 perk backfill for brand-new users. Level-up unlocks are granted at
  // claim time in quests.ts, so this no longer needs to run per request.
  await db.execute(sql`
    insert into app.user_perk_unlocks (user_id, level_perk_id, source_level)
    select ${user.id}, level_perks.id, level_perks.level
    from app.level_perks
    where level_perks.level <= (select level from app.users where id = ${user.id})
    on conflict (user_id, level_perk_id) do nothing
  `);

  return user;
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

    c.set("authUser", await upsertAuthUser(c.var.db, c.env, payload));

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
    c.set("authUser", await upsertAuthUser(c.var.db, c.env, payload));
  }

  await next();
};

export function getAuthUser(c: { get: (key: "authUser") => AuthUser }) {
  return c.get("authUser");
}
