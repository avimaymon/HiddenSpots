"use server";

import { auth } from "@/lib/auth/config";
import { activeLocationWhere } from "@/lib/db/filters";
import { prisma } from "@/lib/db";
import { revalidateAppPaths } from "@/lib/revalidate";
import { visitSchema } from "@/lib/validations/schemas";
import { computeBadges } from "@/lib/badges";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createVisit(data: unknown) {
  const userId = await requireAuth();
  const validated = visitSchema.parse(data);
  const visitedAt =
    validated.visitedAt instanceof Date
      ? validated.visitedAt
      : new Date(validated.visitedAt);

  const visit = await prisma.visit.create({
    data: { ...validated, visitedAt, userId },
  });

  // Update location stats
  await prisma.location.update({
    where: { id: validated.locationId },
    data: {
      isVisited: true,
      visitCount: { increment: 1 },
      lastVisitedAt: visitedAt,
    },
  });

  revalidateAppPaths(`/locations/${validated.locationId}`, "/dashboard", "/visits");
  return visit;
}

export async function updateVisit(id: string, data: unknown) {
  const userId = await requireAuth();
  await assertOwns(userId, id);
  const validated = visitSchema.partial().parse(data);
  const visitedAt =
    validated.visitedAt instanceof Date
      ? validated.visitedAt
      : validated.visitedAt
        ? new Date(validated.visitedAt)
        : undefined;

  const visit = await prisma.visit.update({
    where: { id },
    data: { ...validated, ...(visitedAt && { visitedAt }) },
  });
  revalidateAppPaths("/dashboard", "/visits");
  return visit;
}

export async function deleteVisit(id: string) {
  const userId = await requireAuth();
  const visit = await assertOwns(userId, id);
  await prisma.visit.delete({ where: { id } });

  // Recalculate location stats
  const remaining = await prisma.visit.findMany({
    where: { locationId: visit.locationId },
    orderBy: { visitedAt: "desc" },
  });
  await prisma.location.update({
    where: { id: visit.locationId },
    data: {
      visitCount: remaining.length,
      isVisited: remaining.length > 0,
      lastVisitedAt: remaining[0]?.visitedAt ?? null,
    },
  });

  revalidateAppPaths("/dashboard", "/visits");
}

export async function addVisitPhoto(visitId: string, url: string) {
  const userId = await requireAuth();
  const visit = await assertOwns(userId, visitId);
  const photo = await prisma.visitPhoto.create({
    data: { visitId, url },
  });
  revalidateAppPaths("/visits", `/locations/${visit.locationId}`);
  return photo;
}

export async function getVisits() {
  const userId = await requireAuth();
  return prisma.visit.findMany({
    where: { userId },
    include: {
      location: {
        include: {
          category: true,
          photos: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
    orderBy: { visitedAt: "desc" },
  });
}

const SEASON_MAP: Record<number, string> = {
  2: "Spring", 3: "Spring", 4: "Spring",
  5: "Summer", 6: "Summer", 7: "Summer",
  8: "Autumn", 9: "Autumn", 10: "Autumn",
  11: "Winter", 0: "Winter", 1: "Winter",
};

function computeStreak(visits: { visitedAt: Date }[]): number {
  if (!visits.length) return 0;
  const weekStart = (d: Date) => {
    const t = new Date(d);
    t.setDate(t.getDate() - t.getDay());
    t.setHours(0, 0, 0, 0);
    return t.getTime();
  };
  const weeks = [...new Set(visits.map((v) => weekStart(v.visitedAt)))].sort((a, b) => b - a);
  let streak = 1;
  for (let i = 1; i < weeks.length; i++) {
    if (weeks[i - 1] - weeks[i] === 7 * 24 * 60 * 60 * 1000) streak++;
    else break;
  }
  return streak;
}

function computeExplorerRank(totalLocations: number, totalVisits: number): string {
  const score = totalLocations + totalVisits * 2;
  if (score >= 500) return "Legend";
  if (score >= 200) return "Cartographer";
  if (score >= 80) return "Ranger";
  if (score >= 30) return "Pathfinder";
  return "Wanderer";
}

export async function getDashboardStats() {
  const userId = await requireAuth();
  const currentSeason = SEASON_MAP[new Date().getMonth()];

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    totalLocations,
    totalVisits,
    favorites,
    bucketList,
    bucketListVisited,
    recentLocations,
    topVisited,
    recentVisits,
    allVisits,
    seasonalSpots,
    weekLocationsAdded,
    weekVisits,
  ] = await Promise.all([
    prisma.location.count({ where: { userId, ...activeLocationWhere } }),
    prisma.visit.count({ where: { userId } }),
    prisma.location.count({ where: { userId, isFavorite: true, ...activeLocationWhere } }),
    prisma.location.count({ where: { userId, isBucketList: true, ...activeLocationWhere } }),
    prisma.location.count({ where: { userId, isBucketList: true, isVisited: true, ...activeLocationWhere } }),
    prisma.location.findMany({
      where: { userId, ...activeLocationWhere },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { category: true, photos: { where: { isPrimary: true }, take: 1 } },
    }),
    prisma.location.findMany({
      where: { userId, visitCount: { gt: 0 }, ...activeLocationWhere },
      orderBy: { visitCount: "desc" },
      take: 5,
      include: { category: true, photos: { where: { isPrimary: true }, take: 1 } },
    }),
    prisma.visit.findMany({
      where: { userId },
      orderBy: { visitedAt: "desc" },
      take: 10,
      include: {
        location: {
          include: {
            category: true,
            photos: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
    }),
    prisma.visit.findMany({ where: { userId }, select: { visitedAt: true }, orderBy: { visitedAt: "desc" } }),
    prisma.location.findMany({
      where: {
        userId,
        ...activeLocationWhere,
        recommendedSeasons: { has: currentSeason },
        isVisited: false,
      },
      take: 4,
      include: { category: true, photos: { where: { isPrimary: true }, take: 1 } },
    }),
    prisma.location.count({
      where: { userId, ...activeLocationWhere, createdAt: { gte: weekAgo } },
    }),
    prisma.visit.count({
      where: { userId, visitedAt: { gte: weekAgo } },
    }),
  ]);

  const visitStreak = computeStreak(allVisits);
  const explorerRank = computeExplorerRank(totalLocations, totalVisits);

  const allSeasonsCovered = await prisma.location.findFirst({
    where: { userId, ...activeLocationWhere },
    select: { recommendedSeasons: true },
  }).then(async () => {
    const allLocs = await prisma.location.findMany({
      where: { userId, ...activeLocationWhere },
      select: { recommendedSeasons: true },
    });
    const seasonSet = new Set(allLocs.flatMap((l) => l.recommendedSeasons));
    return ["Spring", "Summer", "Autumn", "Winter"].every((s) => seasonSet.has(s));
  });

  const tripCount = await prisma.trip.count({ where: { userId } });

  const earnedBadges = computeBadges({
    totalLocations,
    totalVisits,
    bucketListVisited,
    hasTrips: tripCount > 0,
    allSeasonsCovered,
  });

  return {
    totalLocations,
    totalVisits,
    favorites,
    bucketList,
    bucketListVisited,
    recentLocations,
    topVisited,
    recentVisits,
    visitStreak,
    explorerRank,
    currentSeason,
    seasonalSpots,
    earnedBadges,
    weekLocationsAdded,
    weekVisits,
  };
}

async function assertOwns(userId: string, visitId: string) {
  const visit = await prisma.visit.findFirst({
    where: { id: visitId, userId },
  });
  if (!visit) throw new Error("Not found");
  return visit;
}
