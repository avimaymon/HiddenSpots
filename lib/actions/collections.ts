"use server";

import { randomUUID } from "crypto";
import { revalidateAppPaths } from "@/lib/revalidate";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { CLONE_STOPS_MAX } from "@/lib/export/limits";
import { collectionSchema } from "@/lib/validations/schemas";
import {
  assertCanCloneCollection,
  assertCanCloneCollectionWithToken,
  assertOwnsCollection,
  assertOwnsLocation,
} from "@/lib/permissions/resource-access";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

/** Depth ceiling for the ancestry walk — also the practical folder-nesting limit. */
const MAX_FOLDER_DEPTH = 64;

/**
 * Reject a re-parent that would put `id` inside its own subtree.
 *
 * A direct self-parent is not the only cycle: with A already the parent of B,
 * setting A's parent to B closes the loop just as effectively, and any
 * recursive folder render then never terminates. Walking up from the proposed
 * parent is what catches the indirect case.
 */
async function assertNotDescendant(userId: string, id: string, parentId: string) {
  let cursor: string | null = parentId;
  for (let depth = 0; cursor && depth < MAX_FOLDER_DEPTH; depth++) {
    if (cursor === id) throw new Error("A collection cannot contain itself");
    const row: { parentId: string | null } | null = await prisma.collection.findFirst({
      where: { id: cursor, userId },
      select: { parentId: true },
    });
    cursor = row?.parentId ?? null;
  }
  // Hitting the ceiling means the existing chain is already longer than any
  // real folder tree, which only happens if a cycle predates this check.
  if (cursor) throw new Error("Collection nesting is too deep");
}

export async function getLocationCollectionIds(locationId: string) {
  const userId = await requireAuth();
  const members = await prisma.collectionLocation.findMany({
    where: { locationId, collection: { userId } },
    select: { collectionId: true },
    // A spot cannot belong to more collections than the user has, and
    // getCollections already caps at 500 — beyond that the checkbox list this
    // feeds has nothing to match against anyway.
    take: 500,
  });
  return members.map((m) => m.collectionId);
}

export async function getCollections() {
  const userId = await requireAuth();
  return prisma.collection.findMany({
    where: { userId },
    include: {
      _count: { select: { locations: true } },
      locations: {
        take: 4,
        include: {
          location: {
            include: { photos: { where: { isPrimary: true }, take: 1 } },
          },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
    take: 500,
  });
}

export async function createCollection(data: unknown) {
  const userId = await requireAuth();
  const validated = collectionSchema.parse(data);
  if (validated.parentId) {
    await assertOwnsCollection(userId, validated.parentId);
  }
  // Deduplicate replayed offline writes; see createLocation for why a NULL
  // clientId cannot take this path.
  const collection = validated.clientId
    ? await prisma.collection.upsert({
        where: { userId_clientId: { userId, clientId: validated.clientId } },
        update: {},
        create: { ...validated, userId },
      })
    : await prisma.collection.create({ data: { ...validated, userId } });
  revalidateAppPaths("/collections");
  return collection;
}

export async function updateCollection(id: string, data: unknown) {
  const userId = await requireAuth();
  await assertOwnsCollection(userId, id);
  const validated = collectionSchema.partial().parse(data);

  // createCollection validates parentId; this path did not, so a re-parent
  // could file a folder under a stranger's collection, or under itself — the
  // latter hangs every recursive folder render.
  if (validated.parentId) {
    if (validated.parentId === id) throw new Error("A collection cannot contain itself");
    await assertOwnsCollection(userId, validated.parentId);
    await assertNotDescendant(userId, id, validated.parentId);
  }

  const collection = await prisma.collection.update({
    where: { id },
    data: validated,
  });
  revalidateAppPaths("/collections");
  revalidateAppPaths(`/collections/${id}`);
  return collection;
}

export async function deleteCollection(id: string) {
  const userId = await requireAuth();
  await assertOwnsCollection(userId, id);
  await prisma.collection.updateMany({
    where: { userId, parentId: id },
    data: { parentId: null },
  });
  await prisma.collection.delete({ where: { id } });
  revalidateAppPaths("/collections");
}

export async function addLocationToCollection(
  collectionId: string,
  locationId: string
) {
  const userId = await requireAuth();
  await assertOwnsCollection(userId, collectionId);
  await assertOwnsLocation(userId, locationId);
  await prisma.collectionLocation.upsert({
    where: { collectionId_locationId: { collectionId, locationId } },
    create: { collectionId, locationId },
    update: {},
  });
  revalidateAppPaths(`/collections/${collectionId}`);
  revalidateAppPaths();
}

export async function removeLocationFromCollection(
  collectionId: string,
  locationId: string
) {
  const userId = await requireAuth();
  await assertOwnsCollection(userId, collectionId);
  await prisma.collectionLocation.delete({
    where: { collectionId_locationId: { collectionId, locationId } },
  });
  revalidateAppPaths(`/collections/${collectionId}`);
}

const COLLECTION_LOCATIONS_MAX = 2_000;

export async function getCollectionLocations(collectionId: string) {
  const userId = await requireAuth();
  await assertOwnsCollection(userId, collectionId);
  return prisma.collectionLocation.findMany({
    where: { collectionId },
    include: {
      location: {
        include: {
          category: true,
          photos: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
    take: COLLECTION_LOCATIONS_MAX,
  });
}

export async function updateCategoryAppearance(
  id: string,
  data: { color?: string; icon?: string }
) {
  const userId = await requireAuth();
  await prisma.category.updateMany({
    where: { id, userId },
    data: { color: data.color, icon: data.icon },
  });
}

export async function getUserCategories() {
  const userId = await requireAuth();
  return prisma.category.findMany({
    where: { OR: [{ userId }, { isSystem: true }] },
    orderBy: [{ isSystem: "asc" }, { name: "asc" }],
    take: 200,
  });
}

/**
 * Clone a (possibly shared) collection into the current user's atlas.
 * Open links require `shareToken`; targeted grants / owner work without it.
 */
export async function cloneCollection(collectionId: string, shareToken?: string) {
  const userId = await requireAuth();
  if (shareToken) {
    await assertCanCloneCollectionWithToken(userId, collectionId, shareToken);
  } else {
    await assertCanCloneCollection(userId, collectionId);
  }
  const source = await prisma.collection.findFirst({
    where: { id: collectionId },
    include: {
      locations: {
        where: { location: { deletedAt: null } },
        include: {
          location: {
            select: {
              title: true,
              description: true,
              latitude: true,
              longitude: true,
              altitude: true,
              address: true,
              privacy: true,
              deletedAt: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
        take: CLONE_STOPS_MAX + 1,
      },
    },
  });
  if (!source) throw new Error("Collection not found");

  const truncated = source.locations.length > CLONE_STOPS_MAX;
  const copyable = source.locations
    .slice(0, CLONE_STOPS_MAX)
    // SECRET spots are skipped rather than fuzzed: copying them would put
    // exact coordinates into an atlas whose owner was never trusted with them.
    .filter((cl) => cl.location && !cl.location.deletedAt && cl.location.privacy !== "SECRET");

  // Ids are minted here so the join rows can be built without reading back
  // what createMany inserted — createMany does not return them.
  const rows = copyable.map((cl, i) => ({ id: randomUUID(), loc: cl.location!, sortOrder: i }));

  // One transaction, three statements regardless of size. The previous shape
  // issued two sequential creates per stop with no cap, so a large shared
  // collection meant hundreds of round trips to Neon — and a failure part-way
  // left a half-populated collection sitting in the user's atlas.
  const clone = await prisma.$transaction(
    async (tx) => {
      const created = await tx.collection.create({
        data: {
          userId,
          name: `${source.name} (עותק)`,
          description: source.description,
          color: source.color,
          icon: source.icon,
        },
      });

      if (rows.length) {
        await tx.location.createMany({
          data: rows.map(({ id, loc }) => ({
            id,
            userId,
            title: loc.title,
            description: loc.description,
            latitude: loc.latitude,
            longitude: loc.longitude,
            altitude: loc.altitude,
            address: loc.address,
            privacy: "PRIVATE" as const,
          })),
        });
        await tx.collectionLocation.createMany({
          data: rows.map(({ id, sortOrder }) => ({
            collectionId: created.id,
            locationId: id,
            sortOrder,
          })),
        });
      }

      return created;
    },
    { timeout: 20_000 }
  );

  revalidateAppPaths("/collections", "/locations");
  return { ...clone, truncated };
}
