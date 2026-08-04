import { prisma } from "@/lib/db";
import { activeLocationWhere } from "@/lib/db/filters";

/** Cap markers per initial map load — favorites/recent first. Pan fills via fetchMapLocationsInBounds. */
export const MAP_LOCATION_LIMIT = 2000;

/** Lean map payload — minimal fields for markers & clustering */
export async function getMapPageData(userId: string) {
  const where = { userId, ...activeLocationWhere };
  // ponytail: memberships fetched lazily via fetchCollectionMemberships when filters active
  const [locations, totalCount, collections, categories] = await Promise.all([
    prisma.location.findMany({
      where,
      select: {
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
      },
      orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
      take: MAP_LOCATION_LIMIT,
    }),
    prisma.location.count({ where }),
    prisma.collection.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        color: true,
        _count: { select: { locations: true } },
      },
      orderBy: { sortOrder: "asc" },
      take: 500,
    }),
    prisma.category.findMany({
      where: { OR: [{ userId }, { isSystem: true }] },
      select: { id: true, name: true, color: true, icon: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
  ]);

  return {
    locations,
    collections,
    categories,
    collectionMembers: [] as { collectionId: string; locationId: string }[],
    totalCount,
    truncated: totalCount > locations.length,
  };
}
