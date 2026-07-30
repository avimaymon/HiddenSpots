import { describe, expect, it } from "vitest";
import { sortByDistance, filterWithinRadius, estimateEtaMinutes } from "@/lib/geo/nearby";
import { extractMyMapsMid } from "@/lib/geo/mymaps";

describe("nearby", () => {
  const origin = { latitude: 32.08, longitude: 34.78 };
  const spots = [
    { id: "far", latitude: 33.0, longitude: 35.5 },
    { id: "near", latitude: 32.085, longitude: 34.785 },
    { id: "mid", latitude: 32.2, longitude: 34.9 },
  ];

  it("sorts by distance", () => {
    const sorted = sortByDistance(spots, origin);
    expect(sorted.map((s) => s.id)).toEqual(["near", "mid", "far"]);
  });

  it("filters radius", () => {
    const within = filterWithinRadius(spots, origin, 30_000);
    expect(within.map((s) => s.id)).toContain("near");
    expect(within.map((s) => s.id)).not.toContain("far");
  });

  it("estimates ETA", () => {
    expect(estimateEtaMinutes(1000, "walk")).toBeGreaterThan(5);
    expect(estimateEtaMinutes(40_000, "drive")).toBe(60);
  });
});

describe("extractMyMapsMid", () => {
  it("parses viewer URL", () => {
    expect(
      extractMyMapsMid("https://www.google.com/maps/d/viewer?mid=1abcXYZ_99&usp=sharing")
    ).toBe("1abcXYZ_99");
  });

  it("accepts raw mid", () => {
    expect(extractMyMapsMid("1abcXYZ_99toolong")).toBe("1abcXYZ_99toolong");
  });
});
