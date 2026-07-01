"use server";

import { auth } from "@/lib/auth/config";
import { activeLocationWhere } from "@/lib/db/filters";
import { prisma } from "@/lib/db";
import { revalidateAppPaths } from "@/lib/revalidate";
import { visitSchema } from "@/lib/validations/schemas";

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

export async function getDashboardStats() {
  const userId = await requireAuth();
  const [
    totalLocations,
    totalVisits,
    favorites,
    bucketList,
    recentLocations,
    topVisited,
    recentVisits,
  ] = await Promise.all([
    prisma.location.count({ where: { userId, ...activeLocationWhere } }),
    prisma.visit.count({ where: { userId } }),
    prisma.location.count({ where: { userId, isFavorite: true, ...activeLocationWhere } }),
    prisma.location.count({ where: { userId, isBucketList: true, ...activeLocationWhere } }),
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
  ]);

  return {
    totalLocations,
    totalVisits,
    favorites,
    bucketList,
    recentLocations,
    topVisited,
    recentVisits,
  };
}

async function assertOwns(userId: string, visitId: string) {
  const visit = await prisma.visit.findFirst({
    where: { id: visitId, userId },
  });
  if (!visit) throw new Error("Not found");
  return visit;
}
