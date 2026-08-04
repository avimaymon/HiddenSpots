import { describe, expect, it } from "vitest";

/** Mirrors take+1 paging in getAtlasLocationsPage. */
function slicePage<T>(rows: T[], take: number) {
  const hasMore = rows.length > take;
  return { items: hasMore ? rows.slice(0, take) : rows, hasMore };
}

describe("atlas page slice", () => {
  it("detects hasMore from take+1 fetch", () => {
    const rows = Array.from({ length: 201 }, (_, i) => i);
    const { items, hasMore } = slicePage(rows, 200);
    expect(hasMore).toBe(true);
    expect(items).toHaveLength(200);
    expect(items[199]).toBe(199);
  });

  it("hasMore false when under page size", () => {
    expect(slicePage([1, 2, 3], 200)).toEqual({ items: [1, 2, 3], hasMore: false });
  });
});
