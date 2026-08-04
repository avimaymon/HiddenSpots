import { describe, expect, it } from "vitest";
import {
  payloadReferencesClientId,
  rewritePayloadTempIds,
  shouldDeferRetry,
} from "@/lib/offline/id-map";

describe("payloadReferencesClientId", () => {
  it("matches clientId and entity id fields", () => {
    expect(payloadReferencesClientId({ clientId: "tmp-1" }, "tmp-1")).toBe(true);
    expect(payloadReferencesClientId({ tripId: "tmp-1" }, "tmp-1")).toBe(true);
    expect(payloadReferencesClientId({ collectionId: "tmp-1" }, "tmp-1")).toBe(true);
    expect(payloadReferencesClientId({ locationId: "other" }, "tmp-1")).toBe(false);
  });
});

describe("rewritePayloadTempIds", () => {
  it("remaps locationId and drops clientId", () => {
    expect(
      rewritePayloadTempIds(
        { locationId: "tmp-1", clientId: "tmp-1", rating: 5 },
        "tmp-1",
        "srv-9"
      )
    ).toEqual({ locationId: "srv-9", rating: 5 });
  });

  it("remaps collectionId, tripId, and parentId", () => {
    expect(
      rewritePayloadTempIds(
        { collectionId: "tmp-c", tripId: "tmp-c", parentId: "tmp-c", name: "x" },
        "tmp-c",
        "srv-c"
      )
    ).toEqual({ collectionId: "srv-c", tripId: "srv-c", parentId: "srv-c", name: "x" });
  });

  it("leaves unrelated ids alone", () => {
    expect(
      rewritePayloadTempIds({ locationId: "other", collectionId: "c1" }, "tmp-1", "srv-9")
    ).toEqual({ locationId: "other", collectionId: "c1" });
  });
});

describe("shouldDeferRetry", () => {
  const now = new Date("2026-08-05T12:00:00Z").getTime();

  it("returns false with zero retries", () => {
    expect(shouldDeferRetry(0, "2026-08-05T11:59:00Z", now)).toBe(false);
  });

  it("returns false with no lastAttemptAt", () => {
    expect(shouldDeferRetry(3, undefined, now)).toBe(false);
    expect(shouldDeferRetry(3, null, now)).toBe(false);
  });

  it("returns false when the backoff window has passed", () => {
    // 3 retries: 3 * 2^3 = 24 seconds
    const tenMinutesAgo = new Date(now - 600_000).toISOString();
    expect(shouldDeferRetry(3, tenMinutesAgo, now)).toBe(false);
  });

  it("returns true when inside the backoff window", () => {
    // 2 retries: 3 * 2^2 = 12 seconds
    const oneSecondAgo = new Date(now - 1000).toISOString();
    expect(shouldDeferRetry(2, oneSecondAgo, now)).toBe(true);
  });

  it("applies exponential backoff correctly", () => {
    const oneSecondAgo = new Date(now - 1000).toISOString();
    // Retry 1: 3s — should defer
    expect(shouldDeferRetry(1, oneSecondAgo, now)).toBe(true);
    // Retry 2: 6s — should defer (only 1s passed)
    expect(shouldDeferRetry(2, oneSecondAgo, now)).toBe(true);
    // Retry 3: 12s — should defer (only 1s passed)
    expect(shouldDeferRetry(3, oneSecondAgo, now)).toBe(true);
    // Retry 7: 300s — should defer (only 1s passed)
    expect(shouldDeferRetry(7, oneSecondAgo, now)).toBe(true);
  });

  it("caps the backoff at 5 minutes", () => {
    const fiveMinutesAgo = new Date(now - 300_000).toISOString();
    // Retries 7+ all cap at 300s
    expect(shouldDeferRetry(7, fiveMinutesAgo, now)).toBe(false);
    expect(shouldDeferRetry(8, fiveMinutesAgo, now)).toBe(false);
  });

  it("rejects invalid timestamps", () => {
    expect(shouldDeferRetry(3, "not a date", now)).toBe(false);
    expect(shouldDeferRetry(3, "", now)).toBe(false);
  });
});
