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
  it("does not defer fresh items", () => {
    expect(shouldDeferRetry(0, new Date().toISOString())).toBe(false);
  });

  it("defers recent failures", () => {
    const createdAt = new Date(Date.now() - 1000).toISOString();
    expect(shouldDeferRetry(1, createdAt, Date.now())).toBe(true);
  });

  it("allows retry after backoff window", () => {
    const createdAt = new Date(Date.now() - 60_000).toISOString();
    expect(shouldDeferRetry(1, createdAt, Date.now())).toBe(false);
  });
});
