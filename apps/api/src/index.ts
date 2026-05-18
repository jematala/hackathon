import { createEventSchema, type EventSummary } from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cors } from "hono/cors";

type Env = {
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_URL?: string;
};

const demoEvents: EventSummary[] = [
  {
    id: "demo-event",
    title: "Campus meetup",
    description: "Placeholder event data served until the Supabase/PostGIS API path is wired.",
    location: "UNSW Library",
    startsAt: "2026-05-18T09:00:00.000Z",
    createdBy: "demo-user",
    createdAt: "2026-05-18T08:00:00.000Z",
  },
];

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", cors());

app.get("/api/health", (c) => {
  return c.json({
    ok: true,
    service: "jematala-api",
    supabase: Boolean(c.env.SUPABASE_URL && c.env.SUPABASE_SECRET_KEY),
  });
});

app.get("/api/events", (c) => {
  return c.json({ events: demoEvents });
});

app.post("/api/events", zValidator("json", createEventSchema), async (c) => {
  const input = c.req.valid("json");
  const now = Date.now();
  const event = {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description ?? null,
    location: input.location,
    startsAt: Date.parse(input.startsAt),
    createdBy: "demo-user",
    createdAt: now,
  };

  return c.json(
    {
      event: {
        ...event,
        startsAt: new Date(event.startsAt).toISOString(),
        createdAt: new Date(event.createdAt).toISOString(),
      },
    },
    201,
  );
});

app.onError((error, c) => {
  console.error(error);

  return c.json({ error: "Internal server error" }, 500);
});

export default app;
