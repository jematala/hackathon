export type JsonObject = Record<string, unknown>;

export function isoDateTime(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function isoDate(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

export function nullableIsoDateTime(value: Date | string | null) {
  return value ? isoDateTime(value) : null;
}

export function nullableIsoDate(value: Date | string | null) {
  return value ? isoDate(value) : null;
}

export function jsonObject(value: unknown): JsonObject | null {
  if (typeof value === "string") {
    try {
      return jsonObject(JSON.parse(value));
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonObject;
}
