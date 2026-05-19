import { sql } from "drizzle-orm";

import type { getDb } from "../db";
import type { Env } from "../types";

type Database = ReturnType<typeof getDb>;
type ModerationTargetType = "billboard" | "placement" | "sticker_asset";

export type ModerationResult = {
  flagged: boolean;
  categories: Record<string, unknown> | null;
  scores: Record<string, unknown> | null;
  rawResponse: Record<string, unknown> | null;
};

const OPENAI_MODERATIONS_URL = "https://api.openai.com/v1/moderations";

function asPngDataUrl(value: string) {
  return value.startsWith("data:image/png;base64,") ? value : `data:image/png;base64,${value}`;
}

export async function moderateText(env: Env, text: string): Promise<ModerationResult> {
  return moderate(env, text);
}

export async function moderatePng(env: Env, pngBase64: string): Promise<ModerationResult> {
  return moderate(env, [
    {
      type: "image_url",
      image_url: {
        url: asPngDataUrl(pngBase64),
      },
    },
  ]);
}

async function moderate(env: Env, input: unknown): Promise<ModerationResult> {
  if (!env.OPENAI_API_KEY) {
    return {
      categories: null,
      flagged: false,
      rawResponse: null,
      scores: null,
    };
  }

  const response = await fetch(OPENAI_MODERATIONS_URL, {
    body: JSON.stringify({
      input,
      model: "omni-moderation-latest",
    }),
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`OpenAI moderation failed with HTTP ${response.status}.`);
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const first = Array.isArray(raw.results)
    ? (raw.results[0] as Record<string, unknown> | undefined)
    : undefined;

  return {
    categories: objectOrNull(first?.categories),
    flagged: Boolean(first?.flagged),
    rawResponse: raw,
    scores: objectOrNull(first?.category_scores),
  };
}

export async function recordModerationLog(
  db: Database,
  targetType: ModerationTargetType,
  targetId: string,
  result: ModerationResult,
) {
  await db.execute(sql`
    insert into app.content_moderation_logs (
      target_type,
      target_id,
      flagged,
      categories,
      scores,
      raw_response
    )
    values (
      ${targetType},
      ${targetId},
      ${result.flagged},
      ${result.categories ? JSON.stringify(result.categories) : null}::jsonb,
      ${result.scores ? JSON.stringify(result.scores) : null}::jsonb,
      ${result.rawResponse ? JSON.stringify(result.rawResponse) : null}::jsonb
    )
  `);
}

function objectOrNull(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
