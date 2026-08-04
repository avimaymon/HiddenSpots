import { describe, it, expect } from "vitest";
import { newShareToken } from "@/lib/shares/token";

describe("newShareToken", () => {
  it("is 43 base64url chars — 256 bits, inside the 128-char lookup guard", () => {
    const token = newShareToken();
    expect(token).toHaveLength(43);
    expect(token.length).toBeLessThanOrEqual(128);
  });

  it("is URL-safe with no padding", () => {
    for (let i = 0; i < 100; i++) {
      expect(newShareToken()).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("does not repeat across a large batch", () => {
    const tokens = new Set(Array.from({ length: 1000 }, newShareToken));
    expect(tokens.size).toBe(1000);
  });

  it("has no shared prefix between consecutive tokens", () => {
    // cuid()'s failure mode: tokens issued close together share a timestamp
    // prefix, which narrows the search space for a link someone wants to guess.
    const a = newShareToken();
    const b = newShareToken();
    expect(a.slice(0, 8)).not.toBe(b.slice(0, 8));
  });
});
