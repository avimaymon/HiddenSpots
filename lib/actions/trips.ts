"use server";

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { revalidateAppPaths } from "@/lib/revalidate";
import { tripSchema } from "@/lib/validations/schemas";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function getTrips() {
  const userId = await requireAuth();
  return prisma.trip.findMany({
    where: { userId },
    include: {
      _count: { select: { locations: true } },
      locations: {
        orderBy: { sortOrder: "asc" },
        include: {
          location: {
            include: { category: true, photos: { where: { isPrimary: true }, take: 1 } },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getTripById(id: string) {
  const userId = await requireAuth();
  return prisma.trip.findFirst({
    where: { id, userId },
    include: {
      locations: {
        orderBy: { sortOrder: "asc" },
        include: {
          location: {
            include: {
              category: true,
              photos: { where: { isPrimary: true }, take: 1 },
            },
          },
        },
      },
    },
  });
}

export async function createTrip(data: unknown) {
  const userId = await requireAuth();
  const validated = tripSchema.parse(data);
  const trip = await prisma.trip.create({
    data: {
      ...validated,
      userId,
      ...(validated.startDate && { startDate: new Date(validated.startDate) }),
      ...(validated.endDate && { endDate: new Date(validated.endDate) }),
    },
  });
  revalidateAppPaths("/trips");
  return trip;
}

export async function updateTrip(id: string, data: unknown) {
  const userId = await requireAuth();
  await assertOwns(userId, id);
  const validated = tripSchema.partial().parse(data);
  const trip = await prisma.trip.update({
    where: { id },
    data: {
      ...validated,
      ...(validated.startDate && { startDate: new Date(validated.startDate) }),
      ...(validated.endDate && { endDate: new Date(validated.endDate) }),
    },
  });
  revalidateAppPaths("/trips", `/trips/${id}`);
  return trip;
}

export async function deleteTrip(id: string) {
  const userId = await requireAuth();
  await assertOwns(userId, id);
  await prisma.trip.delete({ where: { id } });
  revalidateAppPaths("/trips");
}

export async function addLocationToTrip(tripId: string, locationId: string) {
  const userId = await requireAuth();
  await assertOwns(userId, tripId);
  const maxOrder = await prisma.tripLocation.aggregate({
    where: { tripId },
    _max: { sortOrder: true },
  });
  await prisma.tripLocation.create({
    data: { tripId, locationId, sortOrder: (maxOrder._max.sortOrder ?? 0) + 1 },
  });
  revalidateAppPaths(`/trips/${tripId}`, "/trips");
}

export async function reorderTripLocations(
  tripId: string,
  orderedIds: string[]
) {
  const userId = await requireAuth();
  await assertOwns(userId, tripId);
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.tripLocation.updateMany({
        where: { tripId, locationId: id },
        data: { sortOrder: index },
      })
    )
  );
  revalidateAppPaths(`/trips/${tripId}`);
}

async function assertOwns(userId: string, tripId: string) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId } });
  if (!trip) throw new Error("Not found");
  return trip;
}
