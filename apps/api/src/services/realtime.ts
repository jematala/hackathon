import type { BillboardPlacement, BillboardSummary } from "@repo/shared";

import type { Env } from "../types";

export type RealtimeEvent =
  | {
      billboard: BillboardSummary;
      campusId: string;
      kind: "billboard_created";
    }
  | {
      billboardId: string;
      campusId: string;
      kind: "billboard_deleted";
    }
  | {
      billboardId: string;
      campusId: string;
      kind: "placement_created";
      placement: BillboardPlacement;
    };

export function realtimeStub(env: Env, campusId: string) {
  const roomName = campusId || "unsw";
  const id = env.CAMPUS_REALTIME_ROOM.idFromName(roomName);

  return env.CAMPUS_REALTIME_ROOM.get(id);
}

export async function broadcastRealtime(env: Env, event: RealtimeEvent) {
  if (!env.CAMPUS_REALTIME_ROOM) {
    return;
  }

  const stub = realtimeStub(env, event.campusId);

  await stub.fetch("https://campus-room.local/broadcast", {
    body: JSON.stringify(event),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}
