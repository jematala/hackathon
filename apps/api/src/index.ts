import { events, users } from "@repo/db";
import { createEventSchema, type EventSummary } from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { cors } from "hono/cors";

type Env = {
  DB: D1Database;
};

const demoEvents: EventSummary[] = [
  {
    id: "demo-event",
    title: "Campus meetup",
    description: "Placeholder event data served when D1 is not available locally.",
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
    service: "unsw-connect-api",
    database: Boolean(c.env.DB),
  });
});

app.get("/api/events", async (c) => {
  if (!c.env.DB) {
    return c.json({ events: demoEvents });
  }

  const db = drizzle(c.env.DB);
  const rows = await db.select().from(events).orderBy(desc(events.startsAt)).limit(20);

  return c.json({
    events: rows.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      startsAt: new Date(event.startsAt).toISOString(),
      createdBy: event.createdBy,
      createdAt: new Date(event.createdAt).toISOString(),
    })),
  });
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

  if (!c.env.DB) {
    return c.json(
      {
        event: {
          ...event,
          description: event.description,
          startsAt: new Date(event.startsAt).toISOString(),
          createdAt: new Date(event.createdAt).toISOString(),
        },
      },
      201,
    );
  }

  const db = drizzle(c.env.DB);

  await db
    .insert(users)
    .values({
      id: "demo-user",
      displayName: "Demo User",
      createdAt: now,
    })
    .onConflictDoNothing();

  await db.insert(events).values(event);

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
