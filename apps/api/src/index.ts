import { Hono } from "hono";
import { cors } from "hono/cors";

import { moderation } from "./routes/moderation";

export type Env = {
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_URL?: string;
  DATABASE_URL?: string;
  OPENAI_API_KEY?: string;
  // "false" disables OpenAI Moderation in local dev (treated as opt-in
  // everywhere else). Anything other than "false" enables it when the key
  // is present.
  MODERATION_ENABLED?: string;
  // Per-category thresholds are configured in code at
  // apps/api/src/services/moderation.ts (CATEGORY_THRESHOLDS). They're not
  // env-driven because each category needs its own value and a flat env
  // string would be unwieldy.
};

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", cors());

app.get("/api/health", (c) => {
  return c.json({
    ok: true,
    service: "jematala-api",
    supabase: Boolean(c.env.SUPABASE_URL && c.env.SUPABASE_SECRET_KEY),
    db: Boolean(c.env.DATABASE_URL),
    moderation: Boolean(c.env.OPENAI_API_KEY) && c.env.MODERATION_ENABLED !== "false",
  });
});

app.route("/api/moderate", moderation);

app.onError((error, c) => {
  console.error(error);

  return c.json({ error: "Internal server error" }, 500);
});

export default app;
