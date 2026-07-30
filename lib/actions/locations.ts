"use server";

import { revalidateAppPaths } from "@/lib/revalidate";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { activeLocationWhere } from "@/lib/db/filters";
import { locationSchema } from "@/lib/validations/schemas";
import { assertCanEditLocation } from "@/lib/permissions/share-access";
import { parseHebrewQuery, hasNlFilters } from "@/lib/search/hebrew-nl";
import type { Prisma } from "@prisma/client";

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

/** Near-duplicate check before create (~50m or same title). */
export async function findNearbyDuplicates(input: {
  title: string;
  latitude: number;
  longitude: number;
}) {
  const userId = await requireAuth();
  const existing = await prisma.location.findMany({
    where: { userId, ...activeLocationWhere },
    select: { id: true, title: true, latitude: true, longitude: true },
    take: 500,
  });
  const titleKey = input.title.trim().toLowerCase();
  const hits = existing.filter((loc) => {
    if (loc.title.trim().toLowerCase() === titleKey) return true;
    const dLat = (loc.latitude - input.latitude) * 111_320;
    const dLng =
      (loc.longitude - input.longitude) *
      111_320 *
      Math.cos((input.latitude * Math.PI) / 180);
    return Math.hypot(dLat, dLng) < 50;
  });
  return hits.slice(0, 5);
}

export async function updateLocation(id: string, data: unknown) {
  const userId = await requireAuth();
  // Owner OR share with EDIT/MANAGE
  try {
    await assertOwns(userId, id);
  } catch {
    await assertCanEditLocation(id, userId);
  }
  const validated = locationSchema.partial().parse(data);

  // Record before-state for history
  const before = await prisma.location.findUnique({ where: { id } });

  const location = await prisma.location.update({
    where: { id },
    data: validated,
    include: { category: true, photos: true, tags: { include: { tag: true } } },
  });

  if (before) {
    await prisma.locationHistory.create({
      data: { locationId: id, userId, snapshot: JSON.parse(JSON.stringify(before)) },
    });
  }

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

export async function getDeletedLocations() {
  const userId = await requireAuth();
  return prisma.location.findMany({
    where: { userId, deletedAt: { not: null } },
    include: {
      category: true,
      photos: { where: { isPrimary: true }, take: 1 },
    },
    orderBy: { deletedAt: "desc" },
  });
}

export async function restoreLocation(id: string) {
  const userId = await requireAuth();
  const loc = await prisma.location.findFirst({
    where: { id, userId, deletedAt: { not: null } },
  });
  if (!loc) throw new Error("Not found");
  await prisma.location.update({
    where: { id },
    data: { deletedAt: null },
  });
  revalidateAppPaths("/locations", "/settings");
}

export async function permanentlyDeleteLocation(id: string) {
  const userId = await requireAuth();
  const loc = await prisma.location.findFirst({
    where: { id, userId, deletedAt: { not: null } },
  });
  if (!loc) throw new Error("Not found");
  await prisma.location.delete({ where: { id } });
  revalidateAppPaths("/locations", "/settings");
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

export async function findDuplicateSpotsAction() {
  const userId = await requireAuth();
  const locs = await prisma.location.findMany({
    where: { userId, ...activeLocationWhere },
    select: { id: true, title: true, latitude: true, longitude: true },
  });
  const groups: (typeof locs)[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < locs.length; i++) {
    if (seen.has(locs[i].id)) continue;
    const group = [locs[i]];
    for (let j = i + 1; j < locs.length; j++) {
      if (seen.has(locs[j].id)) continue;
      const titleMatch = locs[i].title.toLowerCase().trim() === locs[j].title.toLowerCase().trim();
      const dLat = (locs[i].latitude - locs[j].latitude) * 111_320;
      const dLng = (locs[i].longitude - locs[j].longitude) * 111_320 * Math.cos((locs[i].latitude * Math.PI) / 180);
      const dist = Math.hypot(dLat, dLng);
      if (titleMatch || dist < 50) {
        group.push(locs[j]);
        seen.add(locs[j].id);
      }
    }
    if (group.length > 1) {
      groups.push(group);
      seen.add(locs[i].id);
    }
  }
  return groups;
}

export async function mergeLocations(keepId: string, deleteId: string) {
  const userId = await requireAuth();
  await assertOwns(userId, keepId);
  await assertOwns(userId, deleteId);
  // Reassign visits and photos before soft-deleting the duplicate
  await prisma.visit.updateMany({ where: { locationId: deleteId }, data: { locationId: keepId } });
  await prisma.locationPhoto.updateMany({ where: { locationId: deleteId }, data: { locationId: keepId } });
  await prisma.collectionLocation.deleteMany({ where: { locationId: deleteId } });
  await prisma.location.update({ where: { id: deleteId }, data: { deletedAt: new Date() } });
  revalidateAppPaths("/locations", "/settings");
}

export async function searchLocationsQuick(query: string) {
  const userId = await requireAuth();
  const nl = parseHebrewQuery(query);
  const where: Prisma.LocationWhereInput = {
    userId,
    ...activeLocationWhere,
  };

  if (hasNlFilters(nl)) {
    if (nl.categoryNameEn || nl.categoryNameHe) {
      where.category = {
        OR: [
          ...(nl.categoryNameEn ? [{ name: nl.categoryNameEn }] : []),
          ...(nl.categoryNameHe ? [{ nameHe: nl.categoryNameHe }] : []),
        ],
      };
    }
    if (nl.isFavorite === true) where.isFavorite = true;
    if (nl.isBucketList === true) where.isBucketList = true;
    if (nl.isVisited !== undefined) where.isVisited = nl.isVisited;
    if (nl.isDogFriendly) where.isDogFriendly = true;
    if (nl.isFamilyFriendly) where.isFamilyFriendly = true;
    if (nl.isCampingAllowed) where.isCampingAllowed = true;
    if (nl.hasParking) where.hasParking = true;
    if (nl.hasWater) where.hasWater = true;
    if (nl.hasShade) where.hasShade = true;
    if (nl.text) {
      where.OR = [
        { title: { contains: nl.text, mode: "insensitive" } },
        { description: { contains: nl.text, mode: "insensitive" } },
        { address: { contains: nl.text, mode: "insensitive" } },
      ];
    }
  } else {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { address: { contains: query, mode: "insensitive" } },
    ];
  }

  return prisma.location.findMany({
    where,
    select: {
      id: true,
      title: true,
      category: { select: { name: true, color: true } },
    },
    take: 8,
    orderBy: { updatedAt: "desc" },
  });
}

export async function getRandomLocation() {
  const userId = await requireAuth();
  const count = await prisma.location.count({ where: { userId, ...activeLocationWhere } });
  if (!count) return null;
  const skip = Math.floor(Math.random() * count);
  const results = await prisma.location.findMany({
    where: { userId, ...activeLocationWhere },
    select: { id: true, title: true, latitude: true, longitude: true },
    take: 1,
    skip,
  });
  return results[0] ?? null;
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

export async function getLocationHistory(locationId: string) {
  const userId = await requireAuth();
  await assertOwns(userId, locationId);
  return prisma.locationHistory.findMany({
    where: { locationId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

async function assertOwns(userId: string, locationId: string) {
  const loc = await prisma.location.findFirst({
    where: { id: locationId, userId },
  });
  if (!loc) throw new Error("Not found");
  return loc;
}
