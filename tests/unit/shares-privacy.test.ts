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
  /** Stand-in for the real HMAC deriver; keeps these tests free of AUTH_SECRET. */
  const deriveSeed = (token: string, locationId: string) => `hmac(${token}/${locationId})`;

  const secretLoc = (id: string) => ({
    id,
    title: "Hidden",
    latitude: 32.07,
    longitude: 34.78,
    privacy: "SECRET",
    address: "Hidden trailhead",
    privateNotes: "code",
  });

  it("fuzzes nested collection locations without any", () => {
    const share = applyPrivacy(
      {
        location: null,
        collection: { id: "c1", locations: [{ locationId: "l1", location: secretLoc("l1") }] },
        trip: null,
      },
      "tok",
      deriveSeed
    );
    const loc = share.collection!.locations[0].location!;
    expect(loc.privateNotes).toBeNull();
    expect(loc.latitude).not.toBe(32.07);
  });

  it("transforms every populated branch, not just the first", () => {
    // A share row carrying more than one resource used to short-circuit on
    // `location`, serving the collection and trip rows as raw Prisma output.
    const share = applyPrivacy(
      {
        location: secretLoc("l0"),
        collection: { id: "c1", locations: [{ locationId: "l1", location: secretLoc("l1") }] },
        trip: { id: "t1", locations: [{ locationId: "l2", location: secretLoc("l2") }] },
      },
      "tok",
      deriveSeed
    );

    for (const loc of [
      share.location!,
      share.collection!.locations[0].location!,
      share.trip!.locations[0].location!,
    ]) {
      expect(loc.privateNotes).toBeNull();
      expect(loc.address).toBeNull();
      expect(loc.latitude).not.toBe(32.07);
      expect(loc.longitude).not.toBe(34.78);
    }
  });

  it("offset is not recoverable from the token and id the recipient already holds", () => {
    // The exploit, asserted as a negative: seeding the fuzz with `token:id`
    // let anyone holding the share link recompute the offset vector and
    // subtract it back out to recover the true coordinates.
    const token = "tok";
    const share = applyPrivacy(
      { location: secretLoc("l1"), collection: null, trip: null },
      token,
      deriveSeed
    );
    const published = share.location!;

    const guessed = fuzzyCoordsStable(32.07, 34.78, 500, `${token}:${published.id}`);
    expect(published.latitude).not.toBeCloseTo(guessed.latitude, 9);
    expect(published.longitude).not.toBeCloseTo(guessed.longitude, 9);

    // And the published pin must still be inside the promised radius.
    const dist = getDistanceBetween(32.07, 34.78, published.latitude, published.longitude);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(500);
  });

  it("keeps a pin stable across repeated loads of the same share", () => {
    const input = { location: secretLoc("l1"), collection: null, trip: null };
    const a = applyPrivacy(input, "tok", deriveSeed).location!;
    const b = applyPrivacy(input, "tok", deriveSeed).location!;
    expect([a.latitude, a.longitude]).toEqual([b.latitude, b.longitude]);
  });
});
