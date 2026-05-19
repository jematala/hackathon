import type { Context } from "hono";

export type Env = {
  CAMPUS_REALTIME_ROOM: DurableObjectNamespace;
  CLERK_PUBLISHABLE_KEY?: string;
  CLERK_SECRET_KEY?: string;
  OPENAI_API_KEY?: string;
  // "false" disables OpenAI Moderation in local dev (treated as opt-in
  // everywhere else). Anything other than "false" enables it when the key
  // is present. Per-category thresholds live in code at
  // apps/api/src/services/moderation.ts.
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
};

export type AppBindings = {
  Bindings: Env;
  Variables: Variables;
};

export type AppContext = Context<AppBindings>;
