export class CampusRealtimeRoomDO implements DurableObject {
  private readonly sessions = new Set<WebSocket>();

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: unknown,
  ) {
    void this.state;
    void this.env;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/broadcast") {
      const payload = await request.text();

      for (const session of this.sessions) {
        try {
          session.send(payload);
        } catch {
          this.sessions.delete(session);
        }
      }

      return Response.json({ delivered: this.sessions.size });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade.", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    server.accept();
    this.sessions.add(server);

    const removeSession = () => {
      this.sessions.delete(server);
      try {
        server.close();
      } catch {
        // The close or error path may fire after the socket has already closed.
      }
    };

    server.addEventListener("close", removeSession);
    server.addEventListener("error", removeSession);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }
}
