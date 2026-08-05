import { describe, it, expect, afterAll } from "vitest";
import { db } from "./client";
import { redactOwnerOnlyForRead } from "@/lib/permissions/owner-only-fields";

/**
 * The read path for a shared spot.
 *
 * `getLocationById` was owner-scoped while `updateLocation` accepted EDIT
 * grants, so a collaborator could save a change to a page that 404'd for them.
 * Opening it up raised a second question the 404 had been hiding: what may a
 * collaborator actually *see* and *do*?
 *
 * `getLocationById` itself calls `auth()` and cannot be invoked here, so these
 * tests pin the two things underneath it that the answer depends on — that the
 * share rows grant what we think they grant, and that the redaction keeps the
 * owner's notes out of the response.
 */
const OWNER = "collab-owner@example.test";
const VIEWER = "collab-viewer@example.test";

// Each seed gets its own pair — reusing an address across cases collides on
// User.email and fails the test for a reason that has nothing to do with it.
let seq = 0;

async function seed(permission: "VIEW" | "COMMENT" | "EDIT") {
  const n = ++seq;
  const owner = await db.user.create({
    data: { email: `${permission}-${n}-${OWNER}`, name: "Owner" },
  });
  const viewer = await db.user.create({
    data: { email: `${permission}-${n}-${VIEWER}`, name: "Viewer" },
  });
  const location = await db.location.create({
    data: {
      userId: owner.id,
      title: "Hidden spring",
      latitude: 32.07,
      longitude: 34.78,
      privateNotes: "gate code 1234",
      privacy: "SECRET",
      fuzzyCoordinates: true,
    },
  });
  await db.share.create({
    data: {
      sharedById: owner.id,
      sharedWithId: viewer.id,
      locationId: location.id,
      permission,
      publicToken: `tok-${permission}-${n}-${Date.now()}`,
    },
  });
  return { owner, viewer, location };
}

afterAll(async () => {
  await db.user.deleteMany({
    where: { email: { contains: "collab-" } },
  });
  await db.$disconnect();
});

describe("collaborator read path", () => {
  it("records a targeted grant the permission check can find", async () => {
    const { viewer, location } = await seed("EDIT");

    const share = await db.share.findFirst({
      where: { locationId: location.id, sharedWithId: viewer.id },
    });

    // A real recipient, not an open link — the two are different axes, and
    // conflating them is what clampOpenSharePermission exists to prevent.
    expect(share?.sharedWithId).toBe(viewer.id);
    expect(share?.permission).toBe("EDIT");
  });

  it("keeps the three permission levels distinct", async () => {
    for (const level of ["VIEW", "COMMENT", "EDIT"] as const) {
      const { viewer, location } = await seed(level);
      const share = await db.share.findFirst({
        where: { locationId: location.id, sharedWithId: viewer.id },
      });
      expect(share?.permission).toBe(level);
    }
  });

  it("never hands a collaborator the owner's private notes", async () => {
    const { location } = await seed("EDIT");
    const row = await db.location.findUniqueOrThrow({ where: { id: location.id } });

    expect(row.privateNotes).toBe("gate code 1234");

    const redacted = redactOwnerOnlyForRead(row);
    expect(redacted.privateNotes).toBeNull();
    // Even at EDIT: the notes are the owner's, not the spot's.
  });

  it("still tells a collaborator the spot is fuzzed", async () => {
    const { location } = await seed("VIEW");
    const row = await db.location.findUniqueOrThrow({ where: { id: location.id } });
    const redacted = redactOwnerOnlyForRead(row);

    // Withholding these would let the map imply a precision the coordinates
    // do not have.
    expect(redacted.privacy).toBe("SECRET");
    expect(redacted.fuzzyCoordinates).toBe(true);
    expect(redacted.fuzzyRadiusMeters).toBe(row.fuzzyRadiusMeters);
  });

  it("leaves no share row behind when the owner's account goes", async () => {
    const { owner, location } = await seed("VIEW");
    await db.user.delete({ where: { id: owner.id } });

    expect(await db.share.count({ where: { locationId: location.id } })).toBe(0);
    expect(await db.location.count({ where: { id: location.id } })).toBe(0);
  });
});
