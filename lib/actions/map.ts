"use server";

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { activeLocationWhere } from "@/lib/db/filters";

const MAP_SELECT = {
  id: true,
  title: true,
  latitude: true,
  longitude: true,
  isFavorite: true,
  isVisited: true,
  visitCount: true,
  coverPhotoUrl: true,
  categoryId: true,
  category: { select: { color: true, icon: true, name: true } },
  photos: { where: { isPrimary: true }, take: 1, select: { url: true } },
} as const;

/** Viewport fill — favorites first. Cap keeps pan-fetch cheap. */
export async function fetchMapLocationsInBounds(bounds: {
  west: number;
  south: number;
  east: number;
  north: number;
  take?: number;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;
  const take = Math.min(Math.max(bounds.take ?? 500, 1), 1000);
  const { west, south, east, north } = bounds;

  return prisma.location.findMany({
    where: {
      userId,
      ...activeLocationWhere,
      latitude: { gte: south, lte: north },
      longitude: { gte: west, lte: east },
    },
    select: MAP_SELECT,
    orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
    take,
  });
}

/** Memberships for active collection filters only — avoids shipping full atlas join table. */
export async function fetchCollectionMemberships(collectionIds: string[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;
  const ids = [...new Set(collectionIds.filter(Boolean))].slice(0, 40);
  if (!ids.length) return [] as { collectionId: string; locationId: string }[];

  // ponytail: hard ceiling — huge collections shouldn't explode map filter payload.
  const MEMBERSHIP_ROWS_MAX = 5_000;
  return prisma.collectionLocation.findMany({
    where: {
      collectionId: { in: ids },
      collection: { userId },
    },
    select: { collectionId: true, locationId: true },
    take: MEMBERSHIP_ROWS_MAX,
  });
}
