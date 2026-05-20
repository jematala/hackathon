import type { z } from "zod";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787";

type FetchOptions<TResponse> = {
  method: "DELETE" | "GET" | "PATCH" | "POST";
  path: string;
  body?: unknown;
  getToken: () => Promise<string | null>;
  schema: z.ZodType<TResponse>;
};

export async function apiFetch<TResponse>({
  method,
  path,
  body,
  getToken,
  schema,
}: FetchOptions<TResponse>): Promise<TResponse> {
  const token = await getToken();

  if (!token) {
    throw new ApiError(401, "unauthorized", "Authentication required.");
  }

  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, init);
  const json: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errObj = (json && typeof json === "object" ? (json as Record<string, unknown>) : {}) as {
      code?: string;
      message?: string;
      error?: string;
    };
    const message = errObj.message ?? errObj.error ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, errObj.code ?? codeFromMessage(message), message);
  }

  return schema.parse(json);
}

function codeFromMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("capacity")) return "capacity_reached";
  if (lower.includes("moderation")) return "moderation_rejected";
  if (lower.includes("already")) return "placement_exists";
  return "request_failed";
}
