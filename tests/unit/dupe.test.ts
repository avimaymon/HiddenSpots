import { describe, expect, it } from "vitest";
import { approxDistanceMeters, DUPE_RADIUS_METERS } from "@/lib/geo/dupe";

describe("dupe helpers", () => {
  it("uses a shared 50m radius", () => {
    expect(DUPE_RADIUS_METERS).toBe(50);
  });

  it("treats same point as zero distance", () => {
    expect(approxDistanceMeters(32.1, 34.8, 32.1, 34.8)).toBe(0);
  });

  it("flags points ~30m apart as near-dupes", () => {
    // ~0.00027° lat ≈ 30m
    const d = approxDistanceMeters(32.1, 34.8, 32.1 + 0.00027, 34.8);
    expect(d).toBeLessThan(DUPE_RADIUS_METERS);
  });

  it("does not flag points ~200m apart", () => {
    const d = approxDistanceMeters(32.1, 34.8, 32.1 + 0.0018, 34.8);
    expect(d).toBeGreaterThan(DUPE_RADIUS_METERS);
  });
});
