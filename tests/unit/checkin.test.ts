import { describe, expect, it } from "vitest";
import { pickCheckinTarget } from "@/lib/geo/checkin";

describe("pickCheckinTarget", () => {
  const spots = [
    { id: "a", title: "Near", latitude: 32.07, longitude: 34.78 },
    { id: "b", title: "Far", latitude: 32.5, longitude: 35.0 },
  ];

  it("picks nearest within radius", () => {
    const pick = pickCheckinTarget(spots, 32.0701, 34.7801, 200);
    expect(pick.ok).toBe(true);
    if (pick.ok) {
      expect(pick.location.id).toBe("a");
      expect(pick.distanceM).toBeLessThan(200);
    }
  });

  it("rejects when nearest is too far", () => {
    const pick = pickCheckinTarget(spots, 31.0, 34.0, 200);
    expect(pick.ok).toBe(false);
    if (!pick.ok) {
      expect(pick.reason).toBe("too_far");
      expect(pick.nearest?.id).toBeTruthy();
    }
  });

  it("handles empty list", () => {
    const pick = pickCheckinTarget([], 32, 34);
    expect(pick.ok).toBe(false);
    if (!pick.ok) expect(pick.reason).toBe("no_spots");
  });
});
