import type { Context } from "hono";

export type Env = {
  CAMPUS_REALTIME_ROOM: DurableObjectNamespace;
  DB: D1Database;
  CLERK_PUBLISHABLE_KEY?: string;
  CLERK_SECRET_KEY?: string;
  OPENAI_API_KEY?: string;
  MODERATION_ENABLED?: string;
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
