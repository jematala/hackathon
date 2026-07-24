import type { Context } from "hono";

import type { getDb } from "./db";

export type Env = {
  CAMPUS_REALTIME_ROOM: DurableObjectNamespace;
  CLERK_PUBLISHABLE_KEY?: string;
  CLERK_SECRET_KEY?: string;
  OPENAI_API_KEY?: string;
  MODERATION_ENABLED?: string;
  SUPABASE_POOLER_DATABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_URL?: string;
};

export type AuthUser = {
  id: string;
  clerkUserId: string;
  username: string;
  displayName: string;
  isAdmin: boolean;
};

export type Variables = {
  authUser: AuthUser;
  db: ReturnType<typeof getDb>;
};

export type AppBindings = {
  Bindings: Env;
  Variables: Variables;
};

export type AppContext = Context<AppBindings>;
