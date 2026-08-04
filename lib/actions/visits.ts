"use server";

import { auth } from "@/lib/auth/config";
import { activeLocationWhere } from "@/lib/db/filters";
import { prisma } from "@/lib/db";
import { revalidateAppPaths } from "@/lib/revalidate";
import { visitSchema } from "@/lib/validations/schemas";
import { computeBadges, computeStreak, visitHourFlags } from "@/lib/badges";
import { assertLocationAccess } from "@/lib/permissions/resource-access";
import { isAllowedPhotoUrl } from "@/lib/media/photo-url";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createVisit(data: unknown) {
  const userId = await requireAuth();
  const validated = visitSchema.parse(data);
  // Owner or share COMMENT+ — never mutate foreign spots anonymously via IDOR
  await assertLocationAccess(userId, validated.locationId, "COMMENT");
  const visitedAt =
    validated.visitedAt instanceof Date
      ? validated.visitedAt
      : new Date(validated.visitedAt);

  const { clientId } = validated;

  /**
   * A replay must return the original visit *without* bumping the counter
   * again — unlike the other creates, this one has a side effect that an
   * upsert would not protect. Deduplicating before the write (rather than
   * catching P2002 inside the transaction) is deliberate: Postgres aborts a
   * transaction on the first failed statement, so a recovery read issued after
   * the failed insert would itself fail.
   */
  const findReplay = () =>
    clientId
      ? prisma.visit.findUnique({
          where: { userId_clientId: { userId, clientId } },
        })
      : Promise.resolve(null);

  let visit = await findReplay();

  if (!visit) {
    try {
      // Array form: the insert and the counter bump commit together, so a
      // failure can no longer leave visitCount disagreeing with the rows.
      [visit] = await prisma.$transaction([
        prisma.visit.create({ data: { ...validated, visitedAt, userId } }),
        prisma.location.update({
          where: { id: validated.locationId },
          data: {
            isVisited: true,
            visitCount: { increment: 1 },
            lastVisitedAt: visitedAt,
          },
        }),
      ]);
    } catch (e) {
      // Two attempts raced past the check above; the loser reads the winner's row.
      if ((e as { code?: string }).code !== "P2002") throw e;
      visit = await findReplay();
      if (!visit) throw e;
    }
  }

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

  // Recalculate location stats without loading every visit row.
  const [visitCount, latest] = await Promise.all([
    prisma.visit.count({ where: { locationId: visit.locationId } }),
    prisma.visit.findFirst({
      where: { locationId: visit.locationId },
      orderBy: { visitedAt: "desc" },
      select: { visitedAt: true },
    }),
  ]);
  await prisma.location.update({
    where: { id: visit.locationId },
    data: {
      visitCount,
      isVisited: visitCount > 0,
      lastVisitedAt: latest?.visitedAt ?? null,
    },
  });

  revalidateAppPaths("/dashboard", "/visits");
}

export async function addVisitPhoto(visitId: string, url: string) {
  const userId = await requireAuth();
  const visit = await assertOwns(userId, visitId);
  if (!isAllowedPhotoUrl(url)) throw new Error("Invalid photo URL");
  const photo = await prisma.visitPhoto.create({
    data: { visitId, url },
  });
  revalidateAppPaths("/visits", `/locations/${visit.locationId}`);
  return photo;
}

/** Recent visits page — hard ceiling so serverless handlers cannot OOM. */
const VISITS_LIST_MAX = 200;

const visitListInclude = {
  location: {
    include: {
      category: true,
      photos: { where: { isPrimary: true }, take: 1 },
    },
  },
} as const;

export async function getVisits(opts?: { take?: number }) {
  const page = await getVisitsPage({ take: opts?.take });
  return page.items;
}

export async function getVisitsPage(opts?: { skip?: number; take?: number }) {
  const userId = await requireAuth();
  const take = Math.min(Math.max(opts?.take ?? VISITS_LIST_MAX, 1), VISITS_LIST_MAX);
  const skip = Math.max(opts?.skip ?? 0, 0);
  const [items, totalCount] = await Promise.all([
    prisma.visit.findMany({
      where: { userId },
      include: visitListInclude,
      orderBy: [{ visitedAt: "desc" }, { id: "desc" }],
      skip,
      take,
    }),
    prisma.visit.count({ where: { userId } }),
  ]);
  return {
    items,
    totalCount,
    hasMore: skip + items.length < totalCount,
    nextSkip: skip + items.length,
  };
}

const SEASON_MAP: Record<number, string> = {
  2: "Spring", 3: "Spring", 4: "Spring",
  5: "Summer", 6: "Summer", 7: "Summer",
  8: "Autumn", 9: "Autumn", 10: "Autumn",
  11: "Winter", 0: "Winter", 1: "Winter",
};

/** Cap for streak / hour-badge sampling (not full history). */
const DASHBOARD_VISIT_SAMPLE_MAX = 500;
const DASHBOARD_SEASON_SAMPLE_MAX = 2_000;

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
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

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
    todayVisits,
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
    prisma.visit.findMany({
      where: { userId },
      select: { visitedAt: true },
      orderBy: { visitedAt: "desc" },
      take: DASHBOARD_VISIT_SAMPLE_MAX,
    }),
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
    prisma.visit.count({
      where: { userId, visitedAt: { gte: startOfToday } },
    }),
  ]);

  const visitStreak = computeStreak(allVisits);
  const explorerRank = computeExplorerRank(totalLocations, totalVisits);

  // ponytail: sample seasons for badge — upgrade to SQL DISTINCT UNNEST if false negatives hurt.
  const seasonRows = await prisma.location.findMany({
    where: { userId, ...activeLocationWhere },
    select: { recommendedSeasons: true },
    take: DASHBOARD_SEASON_SAMPLE_MAX,
  });
  const seasonSet = new Set(seasonRows.flatMap((l) => l.recommendedSeasons));
  const allSeasonsCovered = ["Spring", "Summer", "Autumn", "Winter"].every((s) =>
    seasonSet.has(s)
  );

  const tripCount = await prisma.trip.count({ where: { userId } });

  const { hasNightVisit, hasEarlyVisit } = visitHourFlags(
    allVisits.map((v) => new Date(v.visitedAt))
  );

  const earnedBadges = computeBadges({
    totalLocations,
    totalVisits,
    bucketListVisited,
    hasTrips: tripCount > 0,
    allSeasonsCovered,
    hasNightVisit,
    hasEarlyVisit,
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
    todayVisits,
  };
}

async function assertOwns(userId: string, visitId: string) {
  const visit = await prisma.visit.findFirst({
    where: { id: visitId, userId },
  });
  if (!visit) throw new Error("Not found");
  return visit;
}
