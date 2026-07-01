"use server";

import { revalidateAppPaths } from "@/lib/revalidate";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { collectionSchema } from "@/lib/validations/schemas";

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
  });
}

export async function createCollection(data: unknown) {
  const userId = await requireAuth();
  const validated = collectionSchema.parse(data);
  const collection = await prisma.collection.create({
    data: { ...validated, userId },
  });
  revalidateAppPaths("/collections");
  return collection;
}

export async function updateCollection(id: string, data: unknown) {
  const userId = await requireAuth();
  await assertOwns(userId, id);
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
  await assertOwns(userId, id);
  await prisma.collection.delete({ where: { id } });
  revalidateAppPaths("/collections");
}

export async function addLocationToCollection(
  collectionId: string,
  locationId: string
) {
  const userId = await requireAuth();
  await assertOwns(userId, collectionId);
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
  await assertOwns(userId, collectionId);
  await prisma.collectionLocation.delete({
    where: { collectionId_locationId: { collectionId, locationId } },
  });
  revalidateAppPaths(`/collections/${collectionId}`);
}

export async function getCollectionLocations(collectionId: string) {
  const userId = await requireAuth();
  await assertOwns(userId, collectionId);
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
  });
}

async function assertOwns(userId: string, collectionId: string) {
  const col = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
  });
  if (!col) throw new Error("Not found");
  return col;
}
