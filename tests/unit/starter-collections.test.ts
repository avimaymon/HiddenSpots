import { describe, expect, it } from "vitest";
import { STARTER_COLLECTIONS } from "@/lib/auth/starter-collections";

describe("STARTER_COLLECTIONS", () => {
  it("seeds three Hebrew collections", () => {
    expect(STARTER_COLLECTIONS.map((c) => c.name)).toEqual([
      "מועדפים",
      "לראות",
      "פנינים",
    ]);
    expect(new Set(STARTER_COLLECTIONS.map((c) => c.color)).size).toBe(3);
  });
});
