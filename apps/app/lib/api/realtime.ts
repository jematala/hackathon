import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { realtimeUrl } from "./client";
import { qk } from "./queryKeys";

type RealtimeEvent =
  | {
      billboardId: string;
      campusId: string;
      kind: "billboard_created" | "billboard_deleted";
    }
  | {
      billboardId: string;
      campusId: string;
      kind: "placement_created";
      placementId: string;
    };

export function useCampusRealtime(campusId: string) {
  const { getToken, isSignedIn, userId: clerkUserId } = useAuth();
  const queryClient = useQueryClient();
  const userId = clerkUserId ?? "__signed-out__";

  useEffect(() => {
    if (!isSignedIn) return;

    let closed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const invalidate = (event: RealtimeEvent) => {
      queryClient.invalidateQueries({ queryKey: ["billboards"] });
      queryClient.invalidateQueries({ queryKey: qk.quests(userId) });
      queryClient.invalidateQueries({ queryKey: qk.userProgress(userId) });

      if (event.kind === "placement_created" || event.kind === "billboard_deleted") {
        queryClient.invalidateQueries({ queryKey: qk.billboard(event.billboardId) });
      }
    };

    const connect = async () => {
      const token = await getToken();
      if (closed || !token) return;

      const url = realtimeUrl(`/api/realtime?campusId=${encodeURIComponent(campusId)}`, token);
      socket = new WebSocket(url);

      socket.onmessage = (message) => {
        try {
          invalidate(JSON.parse(String(message.data)) as RealtimeEvent);
        } catch (err) {
          console.warn("[realtime] ignored invalid event", err);
        }
      };

      socket.onclose = () => {
        socket = null;
        if (!closed) {
          reconnectTimer = setTimeout(connect, 1500);
        }
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    void connect();

    return () => {
      closed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [campusId, getToken, isSignedIn, queryClient, userId]);
}
