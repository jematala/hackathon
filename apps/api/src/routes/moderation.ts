import { Hono } from "hono";

import type { Env } from "../index";
import { moderateText } from "../services/moderation";

export const moderation = new Hono<{ Bindings: Env }>();

/**
 * Stateless moderation endpoint. Takes `{ text }`, returns the OpenAI verdict.
 * No DB, no auth — just a passthrough so the FE (or any client) can flag
 * content before persisting it.
 */
moderation.post("/text", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { text?: unknown };
  if (typeof body.text !== "string" || body.text.length === 0) {
    return c.json({ code: "bad_request", message: "Expected { text: string }" }, 400);
  }
  try {
    const verdict = await moderateText(c.env, body.text);
    return c.json(verdict);
  } catch (err) {
    console.error("[moderation]", err);
    return c.json(
      { code: "moderation_error", message: err instanceof Error ? err.message : "unknown" },
      502,
    );
  }
});
