import { describe, expect, it } from "vitest";
import { mergeUpdatePayloads, sameLocationUpdate } from "@/lib/offline/coalesce";
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

describe("DUPE_SCAN_MAX", () => {
  it("caps import/drive near-dupe scans", () => {
    expect(DUPE_SCAN_MAX).toBe(5_000);
  });
});
