import { describe, it, expect } from "vitest";
import { getDistanceBetween, formatDistance, fuzzyCoords } from "@/lib/utils";

describe("getDistanceBetween", () => {
  it("returns 0 for same point", () => {
    expect(getDistanceBetween(31.7683, 35.2137, 31.7683, 35.2137)).toBe(0);
  });

  it("returns ~111km per degree latitude", () => {
    const d = getDistanceBetween(0, 0, 1, 0);
    expect(d).toBeCloseTo(111320, -3);
  });

  it("measures Tel Aviv to Jerusalem ~55km", () => {
    const d = getDistanceBetween(32.0853, 34.7818, 31.7683, 35.2137);
    expect(d).toBeGreaterThan(50000);
    expect(d).toBeLessThan(70000);
  });
});

describe("formatDistance", () => {
  it("Hebrew-first meters / km by default", () => {
    expect(formatDistance(500)).toBe("500 מ׳");
    expect(formatDistance(1500)).toBe("1.5 ק״מ");
    expect(formatDistance(123.7)).toBe("124 מ׳");
  });

  it("English units when locale is en", () => {
    expect(formatDistance(500, "en")).toBe("500m");
    expect(formatDistance(1500, "en")).toBe("1.5km");
  });
});

describe("fuzzyCoords", () => {
  it("displaces by less than 2x the radius", () => {
    const orig = { lat: 32.0, lng: 34.0 };
    const radius = 500;
    const fuzzed = fuzzyCoords(orig.lat, orig.lng, radius);
    const d = getDistanceBetween(orig.lat, orig.lng, fuzzed.latitude, fuzzed.longitude);
    expect(d).toBeLessThan(radius * 2);
  });

  it("produces different coords each call", () => {
    const a = fuzzyCoords(32.0, 34.0);
    const b = fuzzyCoords(32.0, 34.0);
    // Astronomically unlikely to be exactly equal
    expect(a.latitude === b.latitude && a.longitude === b.longitude).toBe(false);
  });
});
