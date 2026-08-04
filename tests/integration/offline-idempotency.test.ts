import { describe, it, expect, afterAll } from "vitest";
import { db } from "./client";

/**
 * The offline queue removes an item only after its action resolves, so a
 * response lost on a flaky connection — the normal case for this app, which is
 * used in the field — is retried. Without a key the server cannot tell that
 * retry from a genuine second spot, and the user comes home to duplicates of
 * everything they logged.
 *
 * Deduplication is enforced by a unique constraint on the row being created
 * rather than a separate keys table: there is no TTL to tune, no sweeper, and
 * no second write that could itself be lost. These tests run against the real
 * migration history, so they also prove the constraints actually exist in a
 * freshly built database — not merely in schema.prisma.
 */
const EMAIL = "idempotency@example.test";

async function user() {
  return db.user.upsert({
    where: { email: EMAIL },
    update: {},
    create: { email: EMAIL, name: "Replay" },
  });
}

const spot = (userId: string, clientId: string | null) => ({
  userId,
  clientId,
  title: "Wadi pool",
  latitude: 30.61,
  longitude: 34.8,
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } });
  await db.$disconnect();
});

describe("offline write deduplication", () => {
  it("collapses a replayed location create onto the original row", async () => {
    const { id: userId } = await user();
    const clientId = "replay-loc-1";

    const first = await db.location.create({ data: spot(userId, clientId) });

    // The retry the client issues when the first response never arrives.
    const second = await db.location.upsert({
      where: { userId_clientId: { userId, clientId } },
      update: {},
      create: spot(userId, clientId),
    });

    expect(second.id).toBe(first.id);
    expect(await db.location.count({ where: { userId, clientId } })).toBe(1);
  });

  it("rejects a second insert with the same key outright", async () => {
    const { id: userId } = await user();
    const clientId = "replay-loc-2";
    await db.location.create({ data: spot(userId, clientId) });

    // Proves the guarantee is the database's, not the upsert's — two racing
    // requests both past the existence check still cannot both insert.
    await expect(
      db.location.create({ data: spot(userId, clientId) })
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("scopes the key per user, so two accounts may reuse one client id", async () => {
    const a = await user();
    const b = await db.user.create({
      data: { email: "idempotency-b@example.test", name: "Other" },
    });
    const clientId = "shared-uuid";

    await db.location.create({ data: spot(a.id, clientId) });
    await db.location.create({ data: spot(b.id, clientId) });

    expect(await db.location.count({ where: { clientId } })).toBe(2);
    await db.user.delete({ where: { id: b.id } });
  });

  it("still allows unlimited online creates, which carry no key", async () => {
    const { id: userId } = await user();

    // NULLs are distinct in a Postgres unique index. If they were not, the
    // constraint would cap every account at a single online-created spot.
    await db.location.create({ data: spot(userId, null) });
    await db.location.create({ data: spot(userId, null) });

    expect(await db.location.count({ where: { userId, clientId: null } })).toBe(2);
  });

  it("applies the same rule to collections, trips, visits and photos", async () => {
    const { id: userId } = await user();
    const clientId = "replay-all";

    await db.collection.create({ data: { userId, clientId, name: "Springs" } });
    await expect(
      db.collection.create({ data: { userId, clientId, name: "Springs" } })
    ).rejects.toMatchObject({ code: "P2002" });

    await db.trip.create({ data: { userId, clientId, name: "Negev" } });
    await expect(
      db.trip.create({ data: { userId, clientId, name: "Negev" } })
    ).rejects.toMatchObject({ code: "P2002" });

    const location = await db.location.create({
      data: spot(userId, "replay-all-loc"),
    });

    const visit = { userId, clientId, locationId: location.id, visitedAt: new Date() };
    await db.visit.create({ data: visit });
    await expect(db.visit.create({ data: visit })).rejects.toMatchObject({
      code: "P2002",
    });

    // A photo's key is global, not per-user: it is the offline blob id, which
    // is a UUID minted on the device.
    const photo = {
      clientId,
      locationId: location.id,
      url: "https://blob.example/a.jpg",
    };
    await db.locationPhoto.create({ data: photo });
    await expect(db.locationPhoto.create({ data: photo })).rejects.toMatchObject({
      code: "P2002",
    });
  });
});
