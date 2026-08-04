import { describe, it, expect } from "vitest";
import { fuzzyCoords, fuzzyCoordsStable, getDistanceBetween } from "@/lib/utils";
import { toPublicLocation } from "@/lib/shares/public-location";
import { applyPrivacy } from "@/lib/shares/apply-privacy";

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

  it("stable fuzz is deterministic per seed", () => {
    const a = fuzzyCoordsStable(exactLat, exactLng, FUZZ_RADIUS, "token-a");
    const b = fuzzyCoordsStable(exactLat, exactLng, FUZZ_RADIUS, "token-a");
    expect(a).toEqual(b);
  });
});

describe("toPublicLocation privacy", () => {
  it("strips privateNotes always", () => {
    const pub = toPublicLocation(
      {
        latitude: 32.07,
        longitude: 34.78,
        privacy: "PUBLIC",
        privateNotes: "secret gate code 1234",
      },
      "share-token"
    );
    expect(pub.privateNotes).toBeNull();
  });

  it("fuzzes SECRET and clears address", () => {
    const pub = toPublicLocation(
      {
        id: "loc1",
        title: "Secret spring",
        latitude: 32.07,
        longitude: 34.78,
        privacy: "SECRET",
        address: "Hidden trailhead",
        privateNotes: "notes",
      },
      "share-token"
    );
    expect(pub.privateNotes).toBeNull();
    expect(pub.address).toBeNull();
    expect(pub.latitude).not.toBe(32.07);
    expect(pub.longitude).not.toBe(34.78);
  });

  it("allowlists fields and drops tips/hazard-style extras", () => {
    const input = {
      id: "loc1",
      title: "Spring",
      description: "Nice",
      latitude: 32.07,
      longitude: 34.78,
      privacy: "PRIVATE",
      privateNotes: "gate",
      tips: "do not leak",
      category: { name: "Spring", color: "#06b6d4", icon: "droplet" },
      photos: [{ id: "p1", url: "/uploads/a.jpg" }],
    };
    const pub = toPublicLocation(input as Parameters<typeof toPublicLocation>[0], "share-token");
    expect(pub).toEqual({
      id: "loc1",
      title: "Spring",
      description: "Nice",
      latitude: 32.07,
      longitude: 34.78,
      address: null,
      privateNotes: null,
      category: {
        name: "Spring",
        nameHe: null,
        color: "#06b6d4",
        icon: "droplet",
      },
      photos: [{ id: "p1", url: "/uploads/a.jpg" }],
    });
    expect("tips" in pub).toBe(false);
  });
});

describe("applyPrivacy", () => {
  it("fuzzes nested collection locations without any", () => {
    const share = applyPrivacy(
      {
        location: null,
        collection: {
          id: "c1",
          locations: [
            {
              locationId: "l1",
              location: {
                id: "l1",
                title: "Hidden",
                latitude: 32.07,
                longitude: 34.78,
                privacy: "SECRET",
                privateNotes: "code",
              },
            },
          ],
        },
        trip: null,
      },
      "tok"
    );
    const loc = share.collection!.locations[0].location!;
    expect(loc.privateNotes).toBeNull();
    expect(loc.latitude).not.toBe(32.07);
  });
});
