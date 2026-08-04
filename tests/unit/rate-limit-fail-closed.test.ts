import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("rateLimit failClosed", () => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    vi.resetModules();
  });

  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("denies when Upstash errors and failClosed is set", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 })
    );
    const { rateLimit } = await import("@/lib/rate-limit");
    const result = await rateLimit("share:tok", 60, 60_000, { failClosed: true });
    expect(result.ok).toBe(false);
    expect(result.upstreamError).toBe(true);
  });

  it("allows when Upstash errors without failClosed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 })
    );
    const { rateLimit } = await import("@/lib/rate-limit");
    const result = await rateLimit("share:tok", 60, 60_000);
    expect(result.ok).toBe(true);
    expect(result.upstreamError).toBe(true);
  });
});
