import type { Env } from "../index";

export type ModerationVerdict =
  | { status: "approved"; maxScore: number; topCategory: string | null }
  | {
      status: "rejected";
      maxScore: number;
      categories: ReadonlyArray<{ category: string; score: number; threshold: number }>;
    }
  | { status: "skipped"; reason: "disabled" | "no_key" };

type OpenAIModerationResponse = {
  results: Array<{
    flagged: boolean;
    categories: Record<string, boolean>;
    category_scores: Record<string, number>;
  }>;
};

const ENDPOINT = "https://api.openai.com/v1/moderations";
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
  // Harassment — students bullying each other is a top concern
  harassment: 0.3,
  "harassment/threatening": 0.3, // threats: strict

  // Hate — campus climate, protected groups
  hate: 0.1,
  "hate/threatening": 0.3, // strict

  // Sexual — not expected in notes, but allow medical/biology/anatomy context
  sexual: 0.1, // looser, since med/bio/psych notes mention sex
  "sexual/minors": 0.1, // near-zero tolerance, always

  // Violence — history, politics, law, criminology notes will mention violence
  violence: 0.1, // very loose, academic context
  "violence/graphic": 0.6, // moderate

  // Self-harm — university mental health is serious; err on the side of intervention
  "self-harm": 0.1,
  "self-harm/intent": 0.3, // strict, route to support resources
  "self-harm/instructions": 0.2, // very strict

  // Illicit — drugs/alcohol talk happens on campuses, but instructions are different
  illicit: 0.1, // loose, students discuss legality/policy
  "illicit/violent": 0.4, // strict
};

const FALLBACK_THRESHOLD = 0.5;

function thresholdFor(category: string): number {
  return CATEGORY_THRESHOLDS[category] ?? FALLBACK_THRESHOLD;
}

function logVerdict(
  text: string,
  scores: Record<string, number>,
  verdict: ModerationVerdict,
): void {
  // Truncate the logged text — moderation calls are usually short, but a long
  // multi-paragraph input would flood the console.
  const preview = text.length > 200 ? `${text.slice(0, 200)}…` : text;
  const sortedScores = Object.entries(scores).sort((a, c) => c[1] - a[1]);

  console.log(`\n[moderation] input: ${JSON.stringify(preview)}`);
  // Compact, aligned per-category readout. Marker "x" = exceeded threshold.
  for (const [category, score] of sortedScores) {
    const t = thresholdFor(category);
    const exceeded = score >= t ? "x" : " ";
    console.log(
      `[moderation]   ${exceeded} ${category.padEnd(26)} score=${score.toFixed(4)}  threshold=${t.toFixed(2)}`,
    );
  }
  if (verdict.status === "rejected") {
    const offenders = verdict.categories
      .map((c) => `${c.category}(${c.score.toFixed(3)})`)
      .join(", ");
    console.log(`[moderation] verdict: REJECTED — ${offenders}\n`);
  } else if (verdict.status === "approved") {
    const top = verdict.topCategory ?? "n/a";
    console.log(
      `[moderation] verdict: approved — closest category was ${top} at ${verdict.maxScore.toFixed(4)}\n`,
    );
  }
}

/**
 * Run text through OpenAI's Moderation API. A category is rejected when its
 * score meets or exceeds the threshold defined in CATEGORY_THRESHOLDS above.
 * Returns "approved" if no category exceeds its threshold, "rejected" with
 * the offending categories otherwise, or "skipped" when moderation is
 * disabled / unconfigured.
 *
 * Throws on network/HTTP failure — callers decide fail-open vs fail-closed.
 */
export async function moderateText(env: Env, text: string): Promise<ModerationVerdict> {
  if (env.MODERATION_ENABLED === "false") {
    return { status: "skipped", reason: "disabled" };
  }
  if (!env.OPENAI_API_KEY) {
    return { status: "skipped", reason: "no_key" };
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, input: text }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI moderation failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as OpenAIModerationResponse;
  const result = json.results[0];
  if (!result) {
    throw new Error("OpenAI moderation returned no results");
  }

  const scored = Object.entries(result.category_scores) as Array<[string, number]>;
  const sorted = scored.slice().sort((a, c) => c[1] - a[1]);
  const top = sorted[0];
  const maxScore = top?.[1] ?? 0;
  const topCategory = top?.[0] ?? null;

  const offending = sorted
    .filter(([category, score]) => score >= thresholdFor(category))
    .map(([category, score]) => ({
      category,
      score,
      threshold: thresholdFor(category),
    }));

  const verdict: ModerationVerdict =
    offending.length === 0
      ? { status: "approved", maxScore, topCategory }
      : { status: "rejected", maxScore, categories: offending };

  logVerdict(text, result.category_scores, verdict);

  return verdict;
}
