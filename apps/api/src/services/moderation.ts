import { sql } from "drizzle-orm";

import { newId } from "../db";
import type { getDb } from "../db";
import type { Env } from "../types";

type Database = ReturnType<typeof getDb>;
type ModerationTargetType = "billboard" | "placement" | "sticker_asset";

type OpenAIModerationResponse = {
  results: Array<{
    flagged: boolean;
    categories: Record<string, boolean>;
    category_scores: Record<string, number>;
  }>;
};

/**
 * Combined moderation result. Two callers:
 *   - /api/moderate/text endpoint returns this directly to the mobile client,
 *     which discriminates on `status` (approved/rejected/skipped) plus the
 *     `rejectedCategories` detail to show users what tripped the filter.
 *   - billboards/stickers routes read `flagged` and persist the raw OpenAI
 *     payload via {@link recordModerationLog}.
 */
export type ModerationResult = {
  status: "approved" | "rejected" | "skipped";
  flagged: boolean;
  // Threshold detail (set when status is "approved" or "rejected").
  maxScore: number;
  topCategory: string | null;
  rejectedCategories: ReadonlyArray<{ category: string; score: number; threshold: number }>;
  // Set when status is "skipped".
  skippedReason: "disabled" | "no_key" | null;
  // Raw OpenAI payload, kept for DB logging.
  categories: Record<string, unknown> | null;
  scores: Record<string, unknown> | null;
  rawResponse: Record<string, unknown> | null;
};

const OPENAI_MODERATIONS_URL = "https://api.openai.com/v1/moderations";
const MODEL = "omni-moderation-latest";

/**
 * Per-category rejection thresholds. Tweak these to match the policy.
 * A category rejects when its score >= its threshold.
 *
 *   Lower  = stricter (rejects mild stuff in this category)
 *   Higher = more permissive (only blocks blatant cases)
 *
 * The values below are sensible defaults — vulnerable categories
 * (sexual/minors, hate/threatening) are kept very strict; categories like
 * "violence" are looser since hyperbole ("I'm gonna kill that quiz") is
 * common in casual text. Unknown / future categories fall back to
 * FALLBACK_THRESHOLD.
 */
const CATEGORY_THRESHOLDS: Readonly<Record<string, number>> = {
  harassment: 0.3,
  "harassment/threatening": 0.3,

  hate: 0.1,
  "hate/threatening": 0.3,

  sexual: 0.1,
  "sexual/minors": 0.1,

  violence: 0.1,
  "violence/graphic": 0.6,

  "self-harm": 0.1,
  "self-harm/intent": 0.3,
  "self-harm/instructions": 0.2,

  illicit: 0.1,
  "illicit/violent": 0.4,
};

const FALLBACK_THRESHOLD = 0.5;

function thresholdFor(category: string): number {
  return CATEGORY_THRESHOLDS[category] ?? FALLBACK_THRESHOLD;
}

function asPngDataUrl(value: string) {
  return value.startsWith("data:image/png;base64,") ? value : `data:image/png;base64,${value}`;
}

function logVerdict(
  previewLabel: string,
  scores: Record<string, number>,
  result: ModerationResult,
): void {
  const sortedScores = Object.entries(scores).sort((a, c) => c[1] - a[1]);

  console.log(`\n[moderation] input: ${previewLabel}`);
  for (const [category, score] of sortedScores) {
    const t = thresholdFor(category);
    const exceeded = score >= t ? "x" : " ";
    console.log(
      `[moderation]   ${exceeded} ${category.padEnd(26)} score=${score.toFixed(4)}  threshold=${t.toFixed(2)}`,
    );
  }
  if (result.status === "rejected") {
    const offenders = result.rejectedCategories
      .map((c) => `${c.category}(${c.score.toFixed(3)})`)
      .join(", ");
    console.log(`[moderation] verdict: REJECTED — ${offenders}\n`);
  } else if (result.status === "approved") {
    const top = result.topCategory ?? "n/a";
    console.log(
      `[moderation] verdict: approved — closest category was ${top} at ${result.maxScore.toFixed(4)}\n`,
    );
  }
}

function skipped(reason: "disabled" | "no_key"): ModerationResult {
  return {
    status: "skipped",
    flagged: false,
    maxScore: 0,
    topCategory: null,
    rejectedCategories: [],
    skippedReason: reason,
    categories: null,
    scores: null,
    rawResponse: null,
  };
}

/**
 * Low-level OpenAI moderation call. Applies the per-category thresholds in
 * {@link CATEGORY_THRESHOLDS} to decide approved vs rejected. Throws on
 * network/HTTP failure — callers decide fail-open vs fail-closed.
 */
async function moderate(env: Env, input: unknown, previewLabel: string): Promise<ModerationResult> {
  if (env.MODERATION_ENABLED === "false") {
    return skipped("disabled");
  }
  if (!env.OPENAI_API_KEY) {
    return skipped("no_key");
  }

  const response = await fetch(OPENAI_MODERATIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, input }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI moderation failed: ${response.status} ${await response.text()}`);
  }

  const raw = (await response.json()) as OpenAIModerationResponse & Record<string, unknown>;
  const first = raw.results?.[0];
  if (!first) {
    throw new Error("OpenAI moderation returned no results");
  }

  const scoreEntries = Object.entries(first.category_scores) as Array<[string, number]>;
  const sorted = scoreEntries.slice().sort((a, c) => c[1] - a[1]);
  const top = sorted[0];
  const maxScore = top?.[1] ?? 0;
  const topCategory = top?.[0] ?? null;

  const rejectedCategories = sorted
    .filter(([category, score]) => score >= thresholdFor(category))
    .map(([category, score]) => ({
      category,
      score,
      threshold: thresholdFor(category),
    }));

  const isRejected = rejectedCategories.length > 0;

  const result: ModerationResult = {
    status: isRejected ? "rejected" : "approved",
    flagged: isRejected,
    maxScore,
    topCategory,
    rejectedCategories,
    skippedReason: null,
    categories: first.categories as Record<string, unknown>,
    scores: first.category_scores as Record<string, unknown>,
    rawResponse: raw,
  };

  logVerdict(previewLabel, first.category_scores, result);

  return result;
}

export async function moderateText(env: Env, text: string): Promise<ModerationResult> {
  // Truncate the logged text — moderation calls are usually short, but a long
  // multi-paragraph input would flood the console.
  const preview = text.length > 200 ? `${text.slice(0, 200)}…` : text;
  return moderate(env, text, JSON.stringify(preview));
}

export async function moderatePng(env: Env, pngBase64: string): Promise<ModerationResult> {
  return moderate(
    env,
    [
      {
        type: "image_url",
        image_url: {
          url: asPngDataUrl(pngBase64),
        },
      },
    ],
    "<png image>",
  );
}

export async function recordModerationLog(
  db: Database,
  targetType: ModerationTargetType,
  targetId: string,
  result: ModerationResult,
) {
  await db.execute(sql`
    insert into content_moderation_logs (
      id,
      target_type,
      target_id,
      flagged,
      categories,
      scores,
      raw_response
    )
    values (
      ${newId()},
      ${targetType},
      ${targetId},
      ${result.flagged},
      ${result.categories ? JSON.stringify(result.categories) : null},
      ${result.scores ? JSON.stringify(result.scores) : null},
      ${result.rawResponse ? JSON.stringify(result.rawResponse) : null}
    )
  `);
}
