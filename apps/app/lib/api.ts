import type {
  EquipSignatureInput,
  EquipSignatureResponse,
  ListMySignaturesResponse,
  ListSignaturesResponse,
} from "@repo/shared";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787";

type ApiFetchOptions = RequestInit & {
  token?: string | null;
};

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T>(path: string, init: ApiFetchOptions = {}): Promise<T> {
  const { token, ...requestInit } = init;
  const headers = new Headers(init.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestInit,
    headers,
  });

  const text = await response.text();
  const data = text.length > 0 ? safeJsonParse(text) : null;

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && data !== null && "message" in data
        ? String((data as { message: unknown }).message)
        : undefined) ??
      response.statusText ??
      `Request failed (${response.status})`;
    throw new ApiError(response.status, data, message);
  }

  return data as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function fetchSignatureCatalog() {
  return apiFetch<ListSignaturesResponse>("/api/signatures");
}

export function fetchMySignatures(token: string) {
  return apiFetch<ListMySignaturesResponse>("/api/users/me/signatures", { token });
}

export function equipSignature(input: EquipSignatureInput, token: string) {
  return apiFetch<EquipSignatureResponse>("/api/users/me/signature", {
    method: "PATCH",
    body: JSON.stringify(input),
    token,
  });
}
