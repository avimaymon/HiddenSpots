import { describe, it, expect, afterEach, vi } from "vitest";
import { deriveShareFuzzSeed } from "@/lib/shares/fuzz-seed";

const SECRET_A = "a".repeat(32);
const SECRET_B = "b".repeat(32);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("deriveShareFuzzSeed", () => {
  it("is deterministic for the same token, location and secret", () => {
    vi.stubEnv("AUTH_SECRET", SECRET_A);
    expect(deriveShareFuzzSeed("tok", "loc1")).toBe(deriveShareFuzzSeed("tok", "loc1"));
  });

  it("separates locations within one share, and shares of one location", () => {
    vi.stubEnv("AUTH_SECRET", SECRET_A);
    expect(deriveShareFuzzSeed("tok", "loc1")).not.toBe(deriveShareFuzzSeed("tok", "loc2"));
    expect(deriveShareFuzzSeed("tok1", "loc1")).not.toBe(deriveShareFuzzSeed("tok2", "loc1"));
  });

  it("depends on the server secret", () => {
    vi.stubEnv("AUTH_SECRET", SECRET_A);
    const withA = deriveShareFuzzSeed("tok", "loc1");
    vi.stubEnv("AUTH_SECRET", SECRET_B);
    expect(deriveShareFuzzSeed("tok", "loc1")).not.toBe(withA);
  });

  it("is not the public `token:id` string the recipient can reconstruct", () => {
    vi.stubEnv("AUTH_SECRET", SECRET_A);
    const seed = deriveShareFuzzSeed("tok", "loc1");
    expect(seed).not.toBe("tok:loc1");
    expect(seed).not.toContain("tok");
    expect(seed).not.toContain("loc1");
  });

  it("refuses to derive without a usable AUTH_SECRET", () => {
    vi.stubEnv("AUTH_SECRET", "");
    expect(() => deriveShareFuzzSeed("tok", "loc1")).toThrow(/AUTH_SECRET/);
    vi.stubEnv("AUTH_SECRET", "too-short");
    expect(() => deriveShareFuzzSeed("tok", "loc1")).toThrow(/AUTH_SECRET/);
  });
});
