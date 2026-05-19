import type { Env } from "../types";

export type RealtimeEvent =
  | {
      campusId: string;
      kind: "billboard_created" | "billboard_deleted";
      billboardId: string;
    }
  | {
      billboardId: string;
      campusId: string;
      kind: "placement_created";
      placementId: string;
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
