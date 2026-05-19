import {
  createBillboardInputSchema,
  createPlacementInputSchema,
  createSavedStickerInputSchema,
  createStickerInputSchema,
  type BillboardDetail,
  type BillboardPlacement,
  type BillboardSummary,
  type ContentStatus,
  type SavedSticker,
  type StickerAsset,
} from "@repo/shared";

type MockBillboard = {
  id: string;
  campusId: string;
  authorId: string;
  body: string;
  lat: number;
  lng: number;
  status: ContentStatus;
  emptyExpiresAt: string;
  expiresAt: string;
  createdAt: string;
};

const DEMO_USER_ID = "00000000-0000-4000-8000-000000000002";
const DEMO_ADMIN_ID = "00000000-0000-4000-8000-000000000001";
const DEMO_CAMPUS_ID = "00000000-0000-4000-8000-000000000100";
const SEED_AIKO_ID = "00000000-0000-4000-8000-000000000010";
const SEED_TESS_ID = "00000000-0000-4000-8000-000000000011";
const SEED_JULES_ID = "00000000-0000-4000-8000-000000000012";
const SEED_BILLBOARD_ID = "00000000-0000-4000-8000-000000000b01";
const SEED_PLACEMENT_IDS = [
  "00000000-0000-4000-8000-000000000c01",
  "00000000-0000-4000-8000-000000000c02",
  "00000000-0000-4000-8000-000000000c03",
] as const;

const seededUsers: Record<string, { username: string }> = {
  [DEMO_USER_ID]: { username: "bluewren" },
  [DEMO_ADMIN_ID]: { username: "admin" },
  [SEED_AIKO_ID]: { username: "aiko" },
  [SEED_TESS_ID]: { username: "tess" },
  [SEED_JULES_ID]: { username: "jules" },
};

const billboards = new Map<string, MockBillboard>();
const placements = new Map<string, BillboardPlacement>();
const stickerAssets = new Map<string, StickerAsset>();
const savedStickers = new Map<string, SavedSticker>();

// Use crypto.randomUUID for created rows so they pass the UUID idSchema. Fall
// back to a deterministic counter only if randomUUID is unavailable.
let fallbackCounter = 0xc100;
const nextId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const hex = (fallbackCounter++).toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex}`;
};
const nowIso = (): string => new Date().toISOString();
const hoursFromNowIso = (hours: number): string =>
  new Date(Date.now() + hours * 3600_000).toISOString();
const usernameFor = (userId: string): string => seededUsers[userId]?.username ?? userId;
const BILLBOARD_LIFETIME_HOURS = 24 * 5;
const BILLBOARD_EMPTY_LIFETIME_HOURS = 24;

const SAVED_STICKER_CAPACITY = 10;
const MAX_CONCURRENT_BILLBOARDS = 3;

let seeded = false;
function ensureSeeded(): void {
  if (seeded) return;
  seeded = true;
  billboards.set(SEED_BILLBOARD_ID, {
    id: SEED_BILLBOARD_ID,
    campusId: DEMO_CAMPUS_ID,
    authorId: DEMO_ADMIN_ID,
    body: "Welcome to Campus Connect — pin a sticky note or sticker on this whiteboard.",
    lat: -33.9173,
    lng: 151.2313,
    status: "active",
    emptyExpiresAt: hoursFromNowIso(BILLBOARD_EMPTY_LIFETIME_HOURS),
    expiresAt: hoursFromNowIso(BILLBOARD_LIFETIME_HOURS),
    createdAt: nowIso(),
  });
  const seedPlacements: Array<Omit<BillboardPlacement, "authorUsername">> = [
    {
      id: SEED_PLACEMENT_IDS[0],
      billboardId: SEED_BILLBOARD_ID,
      authorId: SEED_AIKO_ID,
      kind: "sticky_note",
      x: 0.25,
      y: 0.35,
      zIndex: 0,
      stickerAsset: null,
      body: "g'day from aiko 🐦",
      status: "active",
      createdAt: nowIso(),
    },
    {
      id: SEED_PLACEMENT_IDS[1],
      billboardId: SEED_BILLBOARD_ID,
      authorId: SEED_TESS_ID,
      kind: "sticky_note",
      x: 0.7,
      y: 0.55,
      zIndex: 1,
      stickerAsset: null,
      body: "study group @ Basser Steps, 3pm sharp",
      status: "active",
      createdAt: nowIso(),
    },
    {
      id: SEED_PLACEMENT_IDS[2],
      billboardId: SEED_BILLBOARD_ID,
      authorId: SEED_JULES_ID,
      kind: "sticky_note",
      x: 0.5,
      y: 0.78,
      zIndex: 2,
      stickerAsset: null,
      body: "anyone got Calc II notes? 📚",
      status: "active",
      createdAt: nowIso(),
    },
  ];
  for (const p of seedPlacements) {
    placements.set(p.id, { ...p, authorUsername: usernameFor(p.authorId) });
  }
}

function toSummary(b: MockBillboard): BillboardSummary {
  const placementCount = [...placements.values()].filter(
    (p) => p.billboardId === b.id && p.status !== "removed" && p.status !== "rejected",
  ).length;
  return {
    id: b.id,
    campusId: b.campusId,
    authorId: b.authorId,
    authorUsername: usernameFor(b.authorId),
    body: b.body,
    lat: b.lat,
    lng: b.lng,
    status: b.status,
    placementCount,
    emptyExpiresAt: b.emptyExpiresAt,
    expiresAt: b.expiresAt,
    createdAt: b.createdAt,
  };
}

function toDetail(b: MockBillboard): BillboardDetail {
  const list = [...placements.values()]
    .filter((p) => p.billboardId === b.id)
    .sort((a, c) => a.zIndex - c.zIndex);
  return { ...toSummary(b), placements: list };
}

export class MockApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type MockRequest = {
  method: "GET" | "POST" | "DELETE" | "PATCH";
  path: string;
  body?: unknown;
  userId: string;
};

// Sticky-note bodies are sent to this URL for moderation before the mock
// accepts the placement. Lets us exercise OpenAI moderation end-to-end
// without spinning up a full backend. Required — if EXPO_PUBLIC_API_URL is
// missing, the mock fails closed and the pin is blocked.
const MODERATION_URL = process.env.EXPO_PUBLIC_API_URL
  ? `${process.env.EXPO_PUBLIC_API_URL}/api/moderate/text`
  : null;

type ModerationVerdict =
  | { status: "approved"; maxScore: number; topCategory: string | null }
  | {
      status: "rejected";
      maxScore: number;
      categories: ReadonlyArray<{ category: string; score: number; threshold: number }>;
    }
  | { status: "skipped"; reason: string };

// Fail-closed: anything other than an explicit "approved" verdict blocks the
// pin. The user-facing flow needs to enforce moderation, not paper over it
// with warnings — so misconfig, network errors, and "skipped" all raise.
async function moderateStickyNoteOrThrow(text: string): Promise<void> {
  console.log("[mock] moderating sticky note:", JSON.stringify(text));

  if (!MODERATION_URL) {
    console.error("[mock] EXPO_PUBLIC_API_URL is not set — blocking pin");
    throw new MockApiError(
      503,
      "moderation_unavailable",
      "Moderation isn't configured (EXPO_PUBLIC_API_URL missing). Pin blocked.",
    );
  }

  let res: Response;
  try {
    res = await fetch(MODERATION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error("[mock] moderation request failed:", err);
    throw new MockApiError(
      503,
      "moderation_unavailable",
      "Couldn't reach moderation service. Pin blocked.",
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[mock] moderation API returned", res.status, detail);
    throw new MockApiError(
      503,
      "moderation_unavailable",
      `Moderation service returned ${res.status}. Pin blocked.`,
    );
  }

  const verdict = (await res.json()) as ModerationVerdict;
  console.log("[mock] moderation verdict:", verdict);

  if (verdict.status === "approved") return;

  if (verdict.status === "rejected") {
    const summary = verdict.categories
      .map((c) => `${c.category} (${c.score.toFixed(2)} ≥ ${c.threshold.toFixed(2)})`)
      .join(", ");
    throw new MockApiError(422, "moderation_rejected", `Content flagged: ${summary}`);
  }

  // status === "skipped" — moderation didn't actually run. Block, because the
  // user's intent is that pins must pass moderation.
  throw new MockApiError(
    503,
    "moderation_unavailable",
    `Moderation skipped (${verdict.reason}). Pin blocked — set OPENAI_API_KEY and MODERATION_ENABLED=true to enable.`,
  );
}

export async function dispatchMock(req: MockRequest): Promise<unknown> {
  ensureSeeded();
  const { method, path, body, userId } = req;

  if (method === "GET" && path === "/api/billboards") {
    const list = [...billboards.values()].filter((b) => b.status === "active").map(toSummary);
    return { billboards: list };
  }

  if (method === "GET" && /^\/api\/billboards\/[^/]+$/.test(path)) {
    const id = path.split("/")[3];
    const b = billboards.get(id);
    if (!b || b.status === "removed") {
      throw new MockApiError(404, "not_found", "Billboard not found");
    }
    return { billboard: toDetail(b) };
  }

  if (method === "POST" && path === "/api/billboards") {
    const input = createBillboardInputSchema.parse(body);
    const activeCount = [...billboards.values()].filter(
      (b) => b.authorId === userId && b.status === "active",
    ).length;
    if (activeCount >= MAX_CONCURRENT_BILLBOARDS) {
      throw new MockApiError(409, "billboard_limit_reached", "Active billboard limit reached");
    }
    const id = nextId();
    const created: MockBillboard = {
      id,
      campusId: input.campusId,
      authorId: userId,
      body: input.body,
      lat: input.lat,
      lng: input.lng,
      status: "active",
      emptyExpiresAt: hoursFromNowIso(BILLBOARD_EMPTY_LIFETIME_HOURS),
      expiresAt: hoursFromNowIso(BILLBOARD_LIFETIME_HOURS),
      createdAt: nowIso(),
    };
    billboards.set(id, created);
    return {
      billboard: toSummary(created),
      replacedBillboardId: null,
      questProgress: [],
    };
  }

  if (
    method === "DELETE" &&
    /^\/api\/billboards\/[^/]+$/.test(path) &&
    !path.endsWith("/placements")
  ) {
    const id = path.split("/")[3];
    const b = billboards.get(id);
    if (!b) throw new MockApiError(404, "not_found", "Billboard not found");
    if (b.authorId !== userId) throw new MockApiError(403, "forbidden", "Not your billboard");
    b.status = "removed";
    return { deleted: true };
  }

  if (method === "POST" && /^\/api\/billboards\/[^/]+\/placements$/.test(path)) {
    const billboardId = path.split("/")[3];
    const b = billboards.get(billboardId);
    if (!b || b.status !== "active") {
      throw new MockApiError(404, "not_found", "Billboard not available");
    }
    const existing = [...placements.values()].find(
      (p) => p.billboardId === billboardId && p.authorId === userId && p.status === "active",
    );
    if (existing) {
      throw new MockApiError(409, "placement_exists", "You already replied to this billboard");
    }
    const input = createPlacementInputSchema.parse(body);
    if (input.kind === "sticky_note") {
      await moderateStickyNoteOrThrow(input.body);
    }
    const maxZ = [...placements.values()]
      .filter((p) => p.billboardId === billboardId)
      .reduce((m, p) => Math.max(m, p.zIndex), -1);
    const id = nextId();
    let placement: BillboardPlacement;
    if (input.kind === "sticker") {
      const asset = stickerAssets.get(input.stickerAssetId);
      if (!asset) throw new MockApiError(404, "sticker_not_found", "Sticker asset missing");
      placement = {
        id,
        billboardId,
        authorId: userId,
        authorUsername: usernameFor(userId),
        kind: "sticker",
        x: input.x,
        y: input.y,
        zIndex: maxZ + 1,
        stickerAsset: asset,
        body: null,
        status: "active",
        createdAt: nowIso(),
      };
    } else {
      placement = {
        id,
        billboardId,
        authorId: userId,
        authorUsername: usernameFor(userId),
        kind: "sticky_note",
        x: input.x,
        y: input.y,
        zIndex: maxZ + 1,
        stickerAsset: null,
        body: input.body,
        status: "active",
        createdAt: nowIso(),
      };
    }
    placements.set(id, placement);
    return { placement, questProgress: [] };
  }

  if (method === "POST" && path === "/api/users/me/stickers") {
    const input = createStickerInputSchema.parse(body);
    const id = nextId();
    const asset: StickerAsset = {
      id,
      ownerId: userId,
      pngBase64: input.pngBase64,
      width: input.width,
      height: input.height,
      palette: input.palette ?? null,
      status: "active",
      createdAt: nowIso(),
    };
    stickerAssets.set(id, asset);
    return { sticker: asset };
  }

  if (method === "GET" && path === "/api/users/me/saved-stickers") {
    const list = [...savedStickers.values()].filter((s) => s.userId === userId);
    return { stickers: list, capacity: SAVED_STICKER_CAPACITY };
  }

  if (method === "POST" && path === "/api/users/me/saved-stickers") {
    const input = createSavedStickerInputSchema.parse(body);
    const count = [...savedStickers.values()].filter((s) => s.userId === userId).length;
    if (count >= SAVED_STICKER_CAPACITY) {
      throw new MockApiError(409, "capacity_reached", "Saved sticker capacity reached");
    }
    const id = nextId();
    let saved: SavedSticker;
    if (input.kind === "sticker") {
      const asset = stickerAssets.get(input.stickerAssetId);
      if (!asset) throw new MockApiError(404, "sticker_not_found", "Sticker asset missing");
      saved = {
        id,
        userId,
        kind: "sticker",
        stickerAsset: asset,
        body: null,
        label: input.label ?? null,
        createdAt: nowIso(),
      };
    } else {
      saved = {
        id,
        userId,
        kind: "sticky_note",
        stickerAsset: null,
        body: input.body,
        label: input.label ?? null,
        createdAt: nowIso(),
      };
    }
    savedStickers.set(id, saved);
    return { savedSticker: saved };
  }

  if (method === "DELETE" && /^\/api\/users\/me\/saved-stickers\/[^/]+$/.test(path)) {
    const id = path.split("/")[5];
    const s = savedStickers.get(id);
    if (!s || s.userId !== userId) {
      throw new MockApiError(404, "not_found", "Saved sticker missing");
    }
    savedStickers.delete(id);
    return { deleted: true };
  }

  if (method === "GET" && path === "/api/users/me/progress") {
    const activeBillboards = [...billboards.values()].filter(
      (b) => b.authorId === userId && b.status === "active",
    ).length;
    const stickersSavedByUser = [...savedStickers.values()].filter(
      (s) => s.userId === userId,
    ).length;
    return {
      progress: {
        userId,
        level: 1,
        xp: 0,
        dailyStreak: 0,
        capacities: {
          maxConcurrentBillboards: MAX_CONCURRENT_BILLBOARDS,
          dailyBillboardLimit: 10,
          stickerSlots: SAVED_STICKER_CAPACITY,
        },
        stats: {
          poisVisited: 0,
          billboardsCreatedToday: 0,
          activeBillboards,
          stickersSaved: stickersSavedByUser,
          placementsCreated: 0,
          repliesReceived: 0,
        },
        unlockedPerks: [],
        nextPerks: [],
      },
    };
  }

  if (method === "GET" && path === "/api/users/me") {
    return {
      user: {
        id: userId,
        username: usernameFor(userId),
        displayName: usernameFor(userId),
        avatarBase64: null,
        level: 1,
        isAdmin: userId === DEMO_ADMIN_ID,
        xp: 0,
        dailyStreak: 0,
        streakUpdatedOn: null,
        lastDailyClaimedOn: null,
        bannedAt: null,
        deletedAt: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    };
  }

  throw new MockApiError(404, "no_route", `Mock has no route for ${method} ${path}`);
}
