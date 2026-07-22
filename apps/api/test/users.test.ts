import { describe, expect, test } from "bun:test";

import { isUniqueViolation, validateAvatarPng } from "../src/routes/users";

function pngHeader(width: number, height: number) {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47], 0);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return btoa(String.fromCharCode(...bytes));
}

describe("user route validation", () => {
  test("finds a wrapped PostgreSQL unique violation", () => {
    expect(isUniqueViolation({ cause: { cause: { code: "23505" } } })).toBe(true);
    expect(isUniqueViolation({ cause: { code: "23503" } })).toBe(false);
  });

  test("accepts a 64x64 PNG header", () => {
    expect(() => validateAvatarPng(pngHeader(64, 64))).not.toThrow();
  });

  test("rejects other PNG dimensions", () => {
    expect(() => validateAvatarPng(pngHeader(1024, 1024))).toThrow(
      "Avatar PNG must be 64x64 pixels.",
    );
  });

  test("rejects a non-PNG payload", () => {
    expect(() => validateAvatarPng(btoa("not a png header"))).toThrow(
      "Avatar must be a valid PNG.",
    );
  });
});
