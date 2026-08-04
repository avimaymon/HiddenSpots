import { describe, expect, it } from "vitest";
import { computeBadges, visitHourFlags } from "@/lib/badges";

describe("computeBadges", () => {
  it("awards night_owl and early_bird from flags", () => {
    const earned = computeBadges({
      totalLocations: 1,
      totalVisits: 1,
      bucketListVisited: 0,
      hasTrips: false,
      allSeasonsCovered: false,
      hasNightVisit: true,
      hasEarlyVisit: true,
    });
    expect(earned).toContain("night_owl");
    expect(earned).toContain("early_bird");
    expect(earned).toContain("first_spot");
    expect(earned).toContain("first_visit");
  });

  it("omits time badges without flags", () => {
    const earned = computeBadges({
      totalLocations: 0,
      totalVisits: 0,
      bucketListVisited: 0,
      hasTrips: false,
      allSeasonsCovered: false,
    });
    expect(earned).not.toContain("night_owl");
    expect(earned).not.toContain("early_bird");
  });
});

describe("visitHourFlags", () => {
  it("detects after 21:00 and before 07:00 local", () => {
    const night = new Date(2026, 6, 1, 22, 0, 0);
    const early = new Date(2026, 6, 1, 6, 30, 0);
    const noon = new Date(2026, 6, 1, 12, 0, 0);
    expect(visitHourFlags([noon])).toEqual({ hasNightVisit: false, hasEarlyVisit: false });
    expect(visitHourFlags([night, noon])).toEqual({ hasNightVisit: true, hasEarlyVisit: false });
    expect(visitHourFlags([early, night])).toEqual({ hasNightVisit: true, hasEarlyVisit: true });
  });
});
