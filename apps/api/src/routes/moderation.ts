import { Hono } from "hono";

import { moderateText } from "../services/moderation";
import type { AppBindings } from "../types";

export const moderation = new Hono<AppBindings>();

/**
 * Stateless moderation endpoint. Takes `{ text }`, returns the OpenAI verdict.
 * No DB, no auth — just a passthrough so the FE (or any client) can flag
 * content before persisting it.
 *
 * Response shape is discriminated by `status`: the mobile client reads
 * `categories` (rejected) and `reason` (skipped). We project from the
 * internal {@link ModerationResult} rather than leaking the raw OpenAI
 * payload to the client.
 */
moderation.post("/text", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { text?: unknown };
  if (typeof body.text !== "string" || body.text.length === 0) {
    return c.json({ code: "bad_request", message: "Expected { text: string }" }, 400);
  }
  try {
    const result = await moderateText(c.env, body.text);
    if (result.status === "approved") {
      return c.json({
        status: "approved" as const,
        maxScore: result.maxScore,
        topCategory: result.topCategory,
      });
    }
    if (result.status === "rejected") {
      return c.json({
        status: "rejected" as const,
        maxScore: result.maxScore,
        categories: result.rejectedCategories,
      });
    }
    return c.json({
      status: "skipped" as const,
      reason: result.skippedReason ?? "disabled",
    });
  } catch (err) {
    console.error("[moderation]", err);
    return c.json(
      { code: "moderation_error", message: err instanceof Error ? err.message : "unknown" },
      502,
    );
  }
});
