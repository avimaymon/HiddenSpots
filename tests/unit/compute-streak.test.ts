import { describe, expect, it } from "vitest";
import { computeStreak } from "@/lib/badges";

describe("computeStreak", () => {
  it("counts consecutive week buckets", () => {
    const week = 7 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(12, 0, 0, 0);
    const visits = [
      { visitedAt: start },
      { visitedAt: new Date(start.getTime() - week) },
      { visitedAt: new Date(start.getTime() - 2 * week) },
    ];
    expect(computeStreak(visits)).toBe(3);
  });

  it("returns 0 for empty", () => {
    expect(computeStreak([])).toBe(0);
  });
});
