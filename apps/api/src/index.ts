import { Hono } from "hono";
import { cors } from "hono/cors";

type Env = {
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_URL?: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", cors());

app.get("/api/health", (c) => {
  return c.json({
    ok: true,
    service: "jematala-api",
    supabase: Boolean(c.env.SUPABASE_URL && c.env.SUPABASE_SECRET_KEY),
  });
});

app.onError((error, c) => {
  console.error(error);

  return c.json({ error: "Internal server error" }, 500);
});

export default app;
