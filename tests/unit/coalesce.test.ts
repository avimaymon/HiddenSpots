import { describe, expect, it } from "vitest";
import { mergeUpdatePayloads, orderSyncQueue, sameLocationUpdate } from "@/lib/offline/coalesce";
import { DUPE_SCAN_MAX } from "@/lib/export/limits";

describe("mergeUpdatePayloads", () => {
  it("lets later fields win for the same location", () => {
    const merged = mergeUpdatePayloads(
      { locationId: "a", isBucketList: true, title: "Old" },
      { locationId: "a", title: "New" }
    );
    expect(merged).toEqual({
      locationId: "a",
      isBucketList: true,
      title: "New",
    });
  });

  it("sameLocationUpdate requires matching locationId", () => {
    expect(
      sameLocationUpdate({ locationId: "a" }, { locationId: "a", title: "x" })
    ).toBe(true);
    expect(
      sameLocationUpdate({ locationId: "a" }, { locationId: "b", title: "x" })
    ).toBe(false);
  });
});

describe("orderSyncQueue", () => {
  it("sorts by seq ascending", () => {
    const items = [
      { seq: 3, createdAt: "2026-08-05T12:00:00Z" },
      { seq: 1, createdAt: "2026-08-05T12:00:00Z" },
      { seq: 2, createdAt: "2026-08-05T12:00:00Z" },
    ];
    const ordered = orderSyncQueue(items);
    expect(ordered.map((i) => i.seq)).toEqual([1, 2, 3]);
  });

  it("falls back to insertion order (id) when seq is missing", () => {
    const items = [
      { id: 3 },
      { id: 1 },
      { id: 2 },
    ];
    const ordered = orderSyncQueue(items);
    expect(ordered.map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it("sorts by seq first, then by id", () => {
    const items = [
      { seq: 2, id: 2 },
      { seq: 1, id: 3 },
      { seq: 1, id: 1 },
      { seq: 2, id: 1 },
    ];
    const ordered = orderSyncQueue(items);
    expect(ordered).toEqual([
      { seq: 1, id: 1 },
      { seq: 1, id: 3 },
      { seq: 2, id: 1 },
      { seq: 2, id: 2 },
    ]);
  });

  it("does not mutate the input array", () => {
    const items = [{ seq: 2 }, { seq: 1 }];
    const original = [...items];
    orderSyncQueue(items);
    expect(items).toEqual(original);
  });
});

describe("DUPE_SCAN_MAX", () => {
  it("caps import/drive near-dupe scans", () => {
    expect(DUPE_SCAN_MAX).toBe(5_000);
  });
});
