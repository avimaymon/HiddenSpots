import { describe, it, expect, afterAll } from "vitest";
import { db } from "./client";

/**
 * Account deletion is the GDPR path and it was broken for most accounts:
 * 0_init compiled Share.sharedById and TripLocation.locationId to ON DELETE
 * RESTRICT, which Postgres enforces per-row and non-deferrably, so a single
 * trip stop or a single share made `prisma.user.delete()` throw. Track.userId
 * and LocationHistory.userId had no FK at all, so those rows — history
 * snapshots include privateNotes — outlived the account indefinitely.
 *
 * This exercises the real migration history, not schema.prisma.
 */
async function seedFullyEntangledUser(email: string) {
  const user = await db.user.create({ data: { email, name: "Entangled" } });

  const location = await db.location.create({
    data: {
      userId: user.id,
      title: "Hidden spring",
      latitude: 32.07,
      longitude: 34.78,
      privateNotes: "gate code 1234",
    },
  });

  const trip = await db.trip.create({ data: { userId: user.id, name: "Weekend" } });
  await db.tripLocation.create({
    data: { tripId: trip.id, locationId: location.id, sortOrder: 0 },
  });

  const collection = await db.collection.create({
    data: { userId: user.id, name: "Springs" },
  });

  await db.share.create({
    data: { sharedById: user.id, locationId: location.id, publicToken: `tok-${email}` },
  });

  await db.track.create({
    data: { userId: user.id, locationId: location.id, points: [], name: "Morning loop" },
  });

  await db.locationHistory.create({
    data: {
      locationId: location.id,
      userId: user.id,
      snapshot: { title: "Hidden spring", privateNotes: "gate code 1234" },
    },
  });

  await db.visit.create({
    data: { userId: user.id, locationId: location.id, visitedAt: new Date() },
  });

  return { user, location, trip, collection };
}

afterAll(async () => {
  await db.$disconnect();
});

describe("account deletion", () => {
  it("deletes a user entangled with shares, trip stops, tracks and history", async () => {
    const { user, location, trip } = await seedFullyEntangledUser("entangled@example.test");

    await expect(db.user.delete({ where: { id: user.id } })).resolves.toBeTruthy();

    expect(await db.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(await db.location.findUnique({ where: { id: location.id } })).toBeNull();
    expect(await db.trip.findUnique({ where: { id: trip.id } })).toBeNull();

    // Nothing may survive holding a dangling userId.
    expect(await db.share.count({ where: { sharedById: user.id } })).toBe(0);
    expect(await db.tripLocation.count({ where: { locationId: location.id } })).toBe(0);
    expect(await db.track.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.locationHistory.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.visit.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.collection.count({ where: { userId: user.id } })).toBe(0);
  });

  it("hard-deletes a location that is still referenced by a trip stop", async () => {
    const user = await db.user.create({ data: { email: "stops@example.test" } });
    const location = await db.location.create({
      data: { userId: user.id, title: "Stop", latitude: 31, longitude: 34 },
    });
    const trip = await db.trip.create({ data: { userId: user.id, name: "Route" } });
    await db.tripLocation.create({
      data: { tripId: trip.id, locationId: location.id, sortOrder: 0 },
    });

    // permanentlyDeleteLocation used to throw here on the RESTRICT constraint.
    await expect(db.location.delete({ where: { id: location.id } })).resolves.toBeTruthy();
    expect(await db.tripLocation.count({ where: { tripId: trip.id } })).toBe(0);
    expect(await db.trip.findUnique({ where: { id: trip.id } })).not.toBeNull();

    await db.user.delete({ where: { id: user.id } });
  });
});

describe("share tokens", () => {
  it("has no database-side default, so a forgotten token stays null", async () => {
    // The cuid() default silently produced guessable tokens for any create
    // path that omitted one. Tokens now come from lib/shares/token.ts.
    const user = await db.user.create({ data: { email: "token@example.test" } });
    const collection = await db.collection.create({
      data: { userId: user.id, name: "No token" },
    });
    const share = await db.share.create({
      data: { sharedById: user.id, collectionId: collection.id },
    });

    expect(share.publicToken).toBeNull();

    await db.user.delete({ where: { id: user.id } });
  });
});
