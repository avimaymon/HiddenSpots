import { describe, it, expect, afterAll } from "vitest";
import { db } from "./client";

/**
 * Who may delete a comment.
 *
 * `deleteComment` scoped its `deleteMany` to `{ id, userId }`, so an abusive
 * comment left by someone holding a COMMENT grant could only be removed by its
 * author — the very person who wrote it. The owner's only recourse was
 * revoking the share, which does not remove what was already posted.
 *
 * The action calls `auth()` and cannot run here, so these tests pin the data
 * relationships the authorization decision reads: a comment knows its author,
 * and reaches its spot's owner in one hop.
 */
const TAG = "moderation-";
let seq = 0;

async function seed() {
  const n = ++seq;
  const owner = await db.user.create({
    data: { email: `${TAG}owner-${n}@example.test`, name: "Owner" },
  });
  const commenter = await db.user.create({
    data: { email: `${TAG}commenter-${n}@example.test`, name: "Commenter" },
  });
  const stranger = await db.user.create({
    data: { email: `${TAG}stranger-${n}@example.test`, name: "Stranger" },
  });
  const location = await db.location.create({
    data: { userId: owner.id, title: "Spring", latitude: 32, longitude: 34 },
  });
  const comment = await db.comment.create({
    data: { locationId: location.id, userId: commenter.id, body: "abusive" },
  });
  return { owner, commenter, stranger, location, comment };
}

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { contains: TAG } } });
  await db.$disconnect();
});

describe("comment moderation", () => {
  it("exposes both the author and the spot owner from one comment", async () => {
    const { owner, commenter, comment } = await seed();

    // This is the shape deleteComment reads to decide. If the relation did not
    // reach the owner, the moderation rule could not be expressed at all.
    const row = await db.comment.findUnique({
      where: { id: comment.id },
      select: { userId: true, location: { select: { userId: true } } },
    });

    expect(row?.userId).toBe(commenter.id);
    expect(row?.location?.userId).toBe(owner.id);
  });

  it("identifies a stranger as neither author nor owner", async () => {
    const { stranger, comment } = await seed();
    const row = await db.comment.findUnique({
      where: { id: comment.id },
      select: { userId: true, location: { select: { userId: true } } },
    });

    expect(row?.userId).not.toBe(stranger.id);
    expect(row?.location?.userId).not.toBe(stranger.id);
  });

  it("lets the owner's delete actually remove the row", async () => {
    const { comment } = await seed();
    await db.comment.delete({ where: { id: comment.id } });
    expect(await db.comment.findUnique({ where: { id: comment.id } })).toBeNull();
  });

  it("removes comments with the spot, so deleting a spot cannot orphan them", async () => {
    const { location, comment } = await seed();
    await db.location.delete({ where: { id: location.id } });
    expect(await db.comment.findUnique({ where: { id: comment.id } })).toBeNull();
  });

  it("removes an author's comments when their account goes", async () => {
    const { commenter, comment } = await seed();
    await db.user.delete({ where: { id: commenter.id } });
    expect(await db.comment.findUnique({ where: { id: comment.id } })).toBeNull();
  });
});
