import type { z } from "zod";

import { dispatchMock, MockApiError, type MockRequest } from "./mock";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK_API !== "false";
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787";

type FetchOptions<TResponse> = {
  method: MockRequest["method"];
  path: string;
  body?: unknown;
  userId: string;
  schema: z.ZodType<TResponse>;
};

export async function apiFetch<TResponse>({
  method,
  path,
  body,
  userId,
  schema,
}: FetchOptions<TResponse>): Promise<TResponse> {
  if (USE_MOCK) {
    try {
      const raw = dispatchMock({ method, path, body, userId });
      return schema.parse(raw);
    } catch (err) {
      if (err instanceof MockApiError) {
        throw new ApiError(err.status, err.code, err.message);
      }
      throw err;
    }
  }

  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
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
    throw new ApiError(
      res.status,
      errObj.code ?? "request_failed",
      errObj.message ?? errObj.error ?? `Request failed (${res.status})`,
    );
  }

  return schema.parse(json);
}
