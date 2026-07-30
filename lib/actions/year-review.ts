"use server";

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function getYearReview(year = new Date().getFullYear()) {
  const userId = await requireAuth();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const [visits, locations, topLocations] = await Promise.all([
    prisma.visit.findMany({
      where: { userId, visitedAt: { gte: start, lt: end } },
      include: { location: { select: { title: true, latitude: true, longitude: true } } },
      orderBy: { visitedAt: "asc" },
    }),
    prisma.location.count({ where: { userId, createdAt: { gte: start, lt: end }, deletedAt: null } }),
    prisma.location.findMany({
      where: { userId, deletedAt: null },
      orderBy: { visitCount: "desc" },
      take: 5,
      select: { title: true, visitCount: true },
    }),
  ]);

  const byMonth = Array.from({ length: 12 }, (_, i) => ({
    month: i,
    count: visits.filter((v) => new Date(v.visitedAt).getMonth() === i).length,
  }));

  const uniqueSpots = new Set(visits.map((v) => v.locationId)).size;

  const seasonMap: Record<number, string> = { 0: "winter", 1: "winter", 2: "spring", 3: "spring", 4: "spring", 5: "summer", 6: "summer", 7: "summer", 8: "fall", 9: "fall", 10: "fall", 11: "winter" };
  const seasonCounts = { spring: 0, summer: 0, fall: 0, winter: 0 };
  for (const v of visits) {
    const m = new Date(v.visitedAt).getMonth();
    seasonCounts[seasonMap[m] as keyof typeof seasonCounts]++;
  }
  const favSeason = (Object.entries(seasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null) as string | null;

  return {
    year,
    totalVisits: visits.length,
    uniqueSpots,
    newLocations: locations,
    byMonth,
    topLocations,
    favSeason,
  };
}
