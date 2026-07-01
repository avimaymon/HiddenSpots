import { prisma } from "@/lib/db";
import { activeLocationWhere } from "@/lib/db/filters";

/** Lean map payload — minimal fields for markers & clustering */
export async function getMapPageData(userId: string) {
  const [locations, collections, categories, collectionMembers] = await Promise.all([
    prisma.location.findMany({
      where: { userId, ...activeLocationWhere },
      select: {
        id: true,
        title: true,
        latitude: true,
        longitude: true,
        isFavorite: true,
        isVisited: true,
        coverPhotoUrl: true,
        category: { select: { color: true, icon: true } },
        photos: { where: { isPrimary: true }, take: 1, select: { url: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.collection.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        color: true,
        _count: { select: { locations: true } },
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.category.findMany({
      where: { OR: [{ userId }, { isSystem: true }] },
      select: { id: true, name: true, color: true, icon: true },
      orderBy: { name: "asc" },
    }),
    prisma.collectionLocation.findMany({
      where: { collection: { userId } },
      select: { collectionId: true, locationId: true },
    }),
  ]);

  return { locations, collections, categories, collectionMembers };
}
