"use server";

import { revalidateAppPaths } from "@/lib/revalidate";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { activeLocationWhere } from "@/lib/db/filters";
import { locationSchema } from "@/lib/validations/schemas";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createLocation(data: unknown) {
  const userId = await requireAuth();
  const validated = locationSchema.parse(data);
  const location = await prisma.location.create({
    data: { ...validated, userId },
    include: { category: true, photos: true, tags: { include: { tag: true } } },
  });
  revalidateAppPaths("/locations");
  return location;
}

export async function updateLocation(id: string, data: unknown) {
  const userId = await requireAuth();
  await assertOwns(userId, id);
  const validated = locationSchema.partial().parse(data);
  const location = await prisma.location.update({
    where: { id },
    data: validated,
    include: { category: true, photos: true, tags: { include: { tag: true } } },
  });
  revalidateAppPaths();
  revalidateAppPaths(`/locations/${id}`);
  return location;
}

export async function deleteLocation(id: string) {
  const userId = await requireAuth();
  await assertOwns(userId, id);
  await prisma.location.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidateAppPaths("/locations");
}

export async function toggleFavorite(id: string) {
  const userId = await requireAuth();
  const loc = await assertOwns(userId, id);
  const updated = await prisma.location.update({
    where: { id },
    data: { isFavorite: !loc.isFavorite },
  });
  revalidateAppPaths("/locations");
  return updated.isFavorite;
}

export async function toggleBucketList(id: string) {
  const userId = await requireAuth();
  const loc = await assertOwns(userId, id);
  const updated = await prisma.location.update({
    where: { id },
    data: { isBucketList: !loc.isBucketList },
  });
  revalidateAppPaths("/locations");
  return updated.isBucketList;
}

export async function getLocations(filters?: {
  search?: string;
  categoryId?: string;
  isFavorite?: boolean;
  isBucketList?: boolean;
  isVisited?: boolean;
  tags?: string[];
}) {
  const userId = await requireAuth();
  return prisma.location.findMany({
    where: {
      userId,
      ...activeLocationWhere,
      ...(filters?.categoryId && { categoryId: filters.categoryId }),
      ...(filters?.isFavorite !== undefined && { isFavorite: filters.isFavorite }),
      ...(filters?.isBucketList !== undefined && { isBucketList: filters.isBucketList }),
      ...(filters?.isVisited !== undefined && { isVisited: filters.isVisited }),
      ...(filters?.search && {
        OR: [
          { title: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
          { address: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
      ...(filters?.tags?.length && {
        tags: { some: { tag: { name: { in: filters.tags } } } },
      }),
    },
    include: {
      category: true,
      photos: { where: { isPrimary: true }, take: 1 },
      tags: { include: { tag: true } },
      _count: { select: { visits: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getLocationById(id: string) {
  const userId = await requireAuth();
  return prisma.location.findFirst({
    where: { id, userId, ...activeLocationWhere },
    include: {
      category: true,
      photos: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      tags: { include: { tag: true } },
      visits: {
        include: { photos: true },
        orderBy: { visitedAt: "desc" },
      },
      _count: { select: { visits: true } },
    },
  });
}

export async function addLocationPhoto(
  locationId: string,
  url: string,
  isPrimary = false
) {
  const userId = await requireAuth();
  await assertOwns(userId, locationId);

  if (isPrimary) {
    await prisma.locationPhoto.updateMany({
      where: { locationId },
      data: { isPrimary: false },
    });
  }

  const photo = await prisma.locationPhoto.create({
    data: { locationId, url, isPrimary },
  });

  if (isPrimary) {
    await prisma.location.update({
      where: { id: locationId },
      data: { coverPhotoUrl: url },
    });
  }

  revalidateAppPaths("/locations");
  revalidateAppPaths(`/locations/${locationId}`);
  return photo;
}

export async function addTagToLocation(locationId: string, tagName: string) {
  const userId = await requireAuth();
  await assertOwns(userId, locationId);
  const tag = await prisma.tag.upsert({
    where: { name_userId: { name: tagName.toLowerCase(), userId } },
    create: { name: tagName.toLowerCase(), userId },
    update: {},
  });
  await prisma.tagOnLocation.upsert({
    where: { locationId_tagId: { locationId, tagId: tag.id } },
    create: { locationId, tagId: tag.id },
    update: {},
  });
  revalidateAppPaths(`/locations/${locationId}`);
}

export async function removeTagFromLocation(locationId: string, tagId: string) {
  const userId = await requireAuth();
  await assertOwns(userId, locationId);
  await prisma.tagOnLocation.delete({
    where: { locationId_tagId: { locationId, tagId } },
  });
  revalidateAppPaths(`/locations/${locationId}`);
}

async function assertOwns(userId: string, locationId: string) {
  const loc = await prisma.location.findFirst({
    where: { id: locationId, userId },
  });
  if (!loc) throw new Error("Not found");
  return loc;
}
