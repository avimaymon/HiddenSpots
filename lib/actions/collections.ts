"use server";

import { revalidateAppPaths } from "@/lib/revalidate";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
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

export async function getLocationCollectionIds(locationId: string) {
  const userId = await requireAuth();
  const members = await prisma.collectionLocation.findMany({
    where: { locationId, collection: { userId } },
    select: { collectionId: true },
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
      },
    },
  });
  if (!source) throw new Error("Collection not found");

  const clone = await prisma.collection.create({
    data: {
      userId,
      name: `${source.name} (עותק)`,
      description: source.description,
      color: source.color,
      icon: source.icon,
    },
  });

  let sortOrder = 0;
  for (const cl of source.locations) {
    const loc = cl.location;
    if (!loc || loc.deletedAt) continue;
    // Never copy SECRET exact coordinates into another atlas
    if (loc.privacy === "SECRET") continue;
    const created = await prisma.location.create({
      data: {
        userId,
        title: loc.title,
        description: loc.description,
        latitude: loc.latitude,
        longitude: loc.longitude,
        altitude: loc.altitude,
        address: loc.address,
        privacy: "PRIVATE",
      },
    });
    await prisma.collectionLocation.create({
      data: { collectionId: clone.id, locationId: created.id, sortOrder: sortOrder++ },
    });
  }

  revalidateAppPaths("/collections", "/locations");
  return clone;
}
