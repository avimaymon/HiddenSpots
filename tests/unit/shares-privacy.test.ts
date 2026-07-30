import { describe, it, expect } from "vitest";
import { fuzzyCoords, getDistanceBetween } from "@/lib/utils";

/**
 * Tests that SECRET/fuzzyCoordinates logic correctly displaces coordinates.
 * This mirrors the server-side applyPrivacy logic in shares.ts.
 */
describe("SECRET share coordinate fuzzing", () => {
  const FUZZ_RADIUS = 500;
  const exactLat = 32.07;
  const exactLng = 34.78;

  it("fuzzes coords within 2x the radius", () => {
    const fuzzed = fuzzyCoords(exactLat, exactLng, FUZZ_RADIUS);
    const dist = getDistanceBetween(exactLat, exactLng, fuzzed.latitude, fuzzed.longitude);
    expect(dist).toBeLessThan(FUZZ_RADIUS * 2);
    expect(dist).toBeGreaterThan(0);
  });

  it("does not return exact coordinates", () => {
    const results = Array.from({ length: 20 }, () => fuzzyCoords(exactLat, exactLng, FUZZ_RADIUS));
    const allExact = results.every(
      (r) => r.latitude === exactLat && r.longitude === exactLng
    );
    expect(allExact).toBe(false);
  });

  it("accepts custom radius", () => {
    const fuzzed = fuzzyCoords(exactLat, exactLng, 2000);
    const dist = getDistanceBetween(exactLat, exactLng, fuzzed.latitude, fuzzed.longitude);
    expect(dist).toBeLessThan(4000);
  });
});
