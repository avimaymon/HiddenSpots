import { describe, it, expect, afterAll } from "vitest";
import { db } from "./client";

/**
 * Atomicity cannot be verified against mocks — a mocked client will happily
 * report success for statements that never ran together. These tests force a
 * failure part-way through each multi-statement mutation and assert the
 * database is left as it started.
 *
 * Before this work the codebase contained no $transaction at all, so every one
 * of these sequences could half-apply: a merge that moved the visits but never
 * soft-deleted the loser, a visit whose counter was bumped for a row that was
 * never inserted, a clone that left an empty collection in the atlas.
 */
const EMAIL = "transactions@example.test";

async function owner() {
  return db.user.upsert({
    where: { email: EMAIL },
    update: {},
    create: { email: EMAIL, name: "Tx" },
  });
}

const spotData = (userId: string, title: string) => ({
  userId,
  title,
  latitude: 32.1,
  longitude: 34.9,
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } });
  await db.$disconnect();
});

describe("multi-statement mutations are atomic", () => {
  it("rolls the whole merge back when one statement fails", async () => {
    const { id: userId } = await owner();
    const keep = await db.location.create({ data: spotData(userId, "Keep") });
    const loser = await db.location.create({ data: spotData(userId, "Loser") });
    await db.visit.create({
      data: { userId, locationId: loser.id, visitedAt: new Date() },
    });

    // Mirrors mergeLocations' batch, with an impossible final statement
    // standing in for a mid-flight failure (a lost connection, a timeout).
    await expect(
      db.$transaction([
        db.visit.updateMany({
          where: { locationId: loser.id },
          data: { locationId: keep.id },
        }),
        db.location.update({
          where: { id: "does-not-exist" },
          data: { deletedAt: new Date() },
        }),
      ])
    ).rejects.toThrow();

    // The visit must still belong to the loser, and the loser must still be
    // live: a partial merge is the state that leaves a user with a duplicate
    // spot whose history has silently moved elsewhere.
    const visits = await db.visit.findMany({ where: { locationId: loser.id } });
    expect(visits).toHaveLength(1);
    expect((await db.location.findUnique({ where: { id: loser.id } }))?.deletedAt).toBeNull();
    expect(await db.visit.count({ where: { locationId: keep.id } })).toBe(0);
  });

  it("does not bump visitCount when the visit insert fails", async () => {
    const { id: userId } = await owner();
    const spot = await db.location.create({ data: spotData(userId, "Counter") });
    const clientId = "tx-visit-1";

    await db.visit.create({
      data: { userId, clientId, locationId: spot.id, visitedAt: new Date() },
    });
    await db.location.update({
      where: { id: spot.id },
      data: { visitCount: { increment: 1 }, isVisited: true },
    });

    // A replay: same clientId, so the insert violates the unique index.
    await expect(
      db.$transaction([
        db.visit.create({
          data: { userId, clientId, locationId: spot.id, visitedAt: new Date() },
        }),
        db.location.update({
          where: { id: spot.id },
          data: { visitCount: { increment: 1 } },
        }),
      ])
    ).rejects.toMatchObject({ code: "P2002" });

    // Counter and rows still agree. Run apart, the increment would have
    // committed for a visit that does not exist, and nothing recomputes it.
    const after = await db.location.findUnique({ where: { id: spot.id } });
    expect(after?.visitCount).toBe(1);
    expect(await db.visit.count({ where: { locationId: spot.id } })).toBe(1);
  });

  it("leaves no empty collection behind when a clone fails part-way", async () => {
    const { id: userId } = await owner();
    const before = await db.collection.count({ where: { userId } });

    await expect(
      db.$transaction(async (tx) => {
        await tx.collection.create({ data: { userId, name: "Half-cloned" } });
        // Stands in for the createMany failing: a duplicate primary key.
        const id = "fixed-id-for-collision";
        await tx.location.create({ data: { ...spotData(userId, "A"), id } });
        await tx.location.create({ data: { ...spotData(userId, "B"), id } });
      })
    ).rejects.toThrow();

    expect(await db.collection.count({ where: { userId } })).toBe(before);
    expect(await db.collection.count({ where: { userId, name: "Half-cloned" } })).toBe(0);
  });

  it("commits every statement when nothing fails", async () => {
    const { id: userId } = await owner();
    const keep = await db.location.create({ data: spotData(userId, "Survivor") });
    const loser = await db.location.create({ data: spotData(userId, "Duplicate") });
    await db.visit.create({
      data: { userId, locationId: loser.id, visitedAt: new Date() },
    });

    await db.$transaction([
      db.visit.updateMany({
        where: { locationId: loser.id },
        data: { locationId: keep.id },
      }),
      db.location.update({
        where: { id: loser.id },
        data: { deletedAt: new Date() },
      }),
    ]);

    expect(await db.visit.count({ where: { locationId: keep.id } })).toBe(1);
    expect(
      (await db.location.findUnique({ where: { id: loser.id } }))?.deletedAt
    ).not.toBeNull();
  });
});
