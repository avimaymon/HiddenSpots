import { describe, it, expect, afterAll } from "vitest";
import { db } from "./client";
import {
  seedStarterCollections,
  starterCollectionKey,
  STARTER_COLLECTIONS,
} from "@/lib/auth/starter-collections";

/**
 * The seed runs on signup and again when onboarding finishes, and those can
 * overlap. As a check-then-insert loop with nothing enforcing uniqueness, both
 * calls saw "no rows" and both inserted — so a new user's very first screen
 * showed each starter collection twice.
 *
 * A read followed by a write is not atomic, so this can only be verified
 * against a real database: the guarantee now comes from the unique index, and
 * a mock would not have one.
 */
const EMAIL = "starter@example.test";

async function freshUser(email = EMAIL) {
  await db.user.deleteMany({ where: { email } });
  return db.user.create({ data: { email, name: "Starter" } });
}

afterAll(async () => {
  await db.user.deleteMany({
    where: { email: { in: [EMAIL, "starter-legacy@example.test"] } },
  });
  await db.$disconnect();
});

describe("starter collections seed", () => {
  it("creates one of each", async () => {
    const user = await freshUser();
    await seedStarterCollections(db, user.id);

    const rows = await db.collection.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(STARTER_COLLECTIONS.length);
    expect(rows.map((r) => r.name).sort()).toEqual(
      STARTER_COLLECTIONS.map((c) => c.name).sort()
    );
  });

  it("is idempotent when called again", async () => {
    const user = await freshUser();
    await seedStarterCollections(db, user.id);
    await seedStarterCollections(db, user.id);

    expect(await db.collection.count({ where: { userId: user.id } })).toBe(
      STARTER_COLLECTIONS.length
    );
  });

  it("does not duplicate when two callers race", async () => {
    const user = await freshUser();

    // Signup and markOnboarded overlapping — the case the old loop lost.
    await Promise.all([
      seedStarterCollections(db, user.id),
      seedStarterCollections(db, user.id),
      seedStarterCollections(db, user.id),
    ]);

    expect(await db.collection.count({ where: { userId: user.id } })).toBe(
      STARTER_COLLECTIONS.length
    );
  });

  it("adopts starter rows created before the key existed", async () => {
    const user = await freshUser("starter-legacy@example.test");
    const legacy = STARTER_COLLECTIONS[0]!;

    // An account seeded by the old code: right name, no clientId.
    await db.collection.create({
      data: { userId: user.id, name: legacy.name, color: legacy.color, icon: legacy.icon },
    });

    await seedStarterCollections(db, user.id);

    expect(await db.collection.count({ where: { userId: user.id } })).toBe(
      STARTER_COLLECTIONS.length
    );
    const adopted = await db.collection.findFirst({
      where: { userId: user.id, name: legacy.name },
    });
    expect(adopted?.clientId).toBe(starterCollectionKey(legacy.name));
  });

  it("leaves a user free to name their own collection the same thing", async () => {
    const user = await freshUser();
    await seedStarterCollections(db, user.id);

    // The key is scoped to the starter set, so no global unique-name rule is
    // imposed on collections the user creates themselves.
    await expect(
      db.collection.create({
        data: { userId: user.id, name: STARTER_COLLECTIONS[0]!.name },
      })
    ).resolves.toBeTruthy();
  });
});
