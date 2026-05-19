import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";

import { getDb } from "./db";
import { requireAuth } from "./middleware/auth";
import { billboardsRoute } from "./routes/billboards";
import { poisRoute } from "./routes/pois";
import { questsRoute } from "./routes/quests";
import { reportsRoute } from "./routes/reports";
import { signaturesRoute } from "./routes/signatures";
import { stickersRoute } from "./routes/stickers";
import { usersRoute } from "./routes/users";
import { CampusRealtimeRoomDO } from "./realtime/campus-room";
import { realtimeStub } from "./services/realtime";
import { isSydneyReminderWindow, sendDailyQuestReminder } from "./services/push";
import { ensureDailyRotations, expireBillboards } from "./services/rotations";
import { resetBrokenStreaks } from "./services/streaks";
import type { AppBindings, Env } from "./types";

export { CampusRealtimeRoomDO };

const app = new Hono<AppBindings>();

app.use("/api/*", cors());

app.get("/api/health", (c) => {
  return c.json({
    database: Boolean(c.env.DATABASE_URL),
    durableObjects: Boolean(c.env.CAMPUS_REALTIME_ROOM),
    ok: true,
    service: "jematala-api",
    supabase: Boolean(c.env.SUPABASE_URL && c.env.SUPABASE_SECRET_KEY),
  });
});

app.get("/api/realtime", requireAuth, async (c) => {
  const campusId = c.req.query("campusId") ?? "unsw";
  const stub = realtimeStub(c.env, campusId);

  return stub.fetch(c.req.raw);
});

app.route("/api", usersRoute);
app.route("/api", poisRoute);
app.route("/api", billboardsRoute);
app.route("/api", stickersRoute);
app.route("/api", questsRoute);
app.route("/api", reportsRoute);
app.route("/api", signaturesRoute);

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status);
  }

  console.error(error);

  return c.json({ error: "Internal server error" }, 500);
});

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env) {
    const db = getDb(env);

    await ensureDailyRotations(db);
    await expireBillboards(db);
    await resetBrokenStreaks(db);

    if (isSydneyReminderWindow()) {
      await sendDailyQuestReminder(env, db);
    }
  },
};
