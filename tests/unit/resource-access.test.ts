import { describe, expect, it } from "vitest";
import { clampOpenSharePermission } from "@/lib/permissions/resource-access";
import { fuzzyCoordsStable, getDistanceBetween } from "@/lib/utils";

describe("clampOpenSharePermission", () => {
  it("allows VIEW/COMMENT on open links", () => {
    expect(clampOpenSharePermission("VIEW", null)).toBe("VIEW");
    expect(clampOpenSharePermission("COMMENT", null)).toBe("COMMENT");
  });

  it("clamps EDIT/MANAGE on open links to COMMENT", () => {
    expect(clampOpenSharePermission("EDIT", null)).toBe("COMMENT");
    expect(clampOpenSharePermission("MANAGE", undefined)).toBe("COMMENT");
  });

  it("keeps EDIT/MANAGE for targeted grants", () => {
    expect(clampOpenSharePermission("EDIT", "user-1")).toBe("EDIT");
    expect(clampOpenSharePermission("MANAGE", "user-1")).toBe("MANAGE");
  });
});

describe("fuzzyCoordsStable", () => {
  const lat = 32.07;
  const lng = 34.78;

  it("is deterministic for the same seed", () => {
    const a = fuzzyCoordsStable(lat, lng, 500, "token:loc1");
    const b = fuzzyCoordsStable(lat, lng, 500, "token:loc1");
    expect(a).toEqual(b);
  });

  it("differs across seeds", () => {
    const a = fuzzyCoordsStable(lat, lng, 500, "token:a");
    const b = fuzzyCoordsStable(lat, lng, 500, "token:b");
    expect(a.latitude === b.latitude && a.longitude === b.longitude).toBe(false);
  });

  it("stays within ~2x radius", () => {
    const fuzzed = fuzzyCoordsStable(lat, lng, 500, "token:loc1");
    const dist = getDistanceBetween(lat, lng, fuzzed.latitude, fuzzed.longitude);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(1000);
  });
});
