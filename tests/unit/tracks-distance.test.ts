import { describe, expect, it } from "vitest";
import { haversineKm, summarizeTrackPoints } from "@/lib/geo/track-stats";

describe("track distance", () => {
  it("computes ~1km for ~0.009 deg latitude delta near equator", () => {
    const km = haversineKm({ lat: 0, lng: 0 }, { lat: 0.009, lng: 0 });
    expect(km).toBeGreaterThan(0.9);
    expect(km).toBeLessThan(1.1);
  });

  it("summarizes distance and duration", () => {
    const stats = summarizeTrackPoints([
      { lat: 0, lng: 0, time: 1_000 },
      { lat: 0.009, lng: 0, time: 61_000 },
    ]);
    expect(stats.pointCount).toBe(2);
    expect(stats.distanceKm).toBeGreaterThan(0.9);
    expect(stats.distanceKm).toBeLessThan(1.1);
    expect(stats.durationSec).toBe(60);
  });
});
