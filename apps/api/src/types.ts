import type { Context } from "hono";

export type Env = {
  CAMPUS_REALTIME_ROOM: DurableObjectNamespace;
  CLERK_PUBLISHABLE_KEY?: string;
  CLERK_SECRET_KEY?: string;
  DATABASE_URL?: string;
  EXPO_ACCESS_TOKEN?: string;
  OPENAI_API_KEY?: string;
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
