"use server";

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { revalidateAppPaths } from "@/lib/revalidate";
import { tripSchema } from "@/lib/validations/schemas";
import {
  assertCanCloneTrip,
  assertCanCloneTripWithToken,
  assertOwnsLocation,
  assertOwnsTrip,
} from "@/lib/permissions/resource-access";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

const TRIPS_LIST_MAX = 200;

export async function getTrips() {
  const userId = await requireAuth();
  // List payload: stop titles only (first 5) — full graph lives on getTripById.
  return prisma.trip.findMany({
    where: { userId },
    include: {
      _count: { select: { locations: true } },
      locations: {
        orderBy: { sortOrder: "asc" },
        take: 5,
        select: {
          id: true,
          location: { select: { title: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: TRIPS_LIST_MAX,
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
  const create = {
    ...validated,
    userId,
    ...(validated.startDate && { startDate: new Date(validated.startDate) }),
    ...(validated.endDate && { endDate: new Date(validated.endDate) }),
  };

  // Deduplicate replayed offline writes; see createLocation for why a NULL
  // clientId cannot take this path.
  const trip = validated.clientId
    ? await prisma.trip.upsert({
        where: { userId_clientId: { userId, clientId: validated.clientId } },
        update: {},
        create,
      })
    : await prisma.trip.create({ data: create });
  revalidateAppPaths("/trips");
  return trip;
}

export async function updateTrip(id: string, data: unknown) {
  const userId = await requireAuth();
  await assertOwnsTrip(userId, id);
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
  await assertOwnsTrip(userId, id);
  await prisma.trip.delete({ where: { id } });
  revalidateAppPaths("/trips");
}

export async function addLocationToTrip(tripId: string, locationId: string) {
  const userId = await requireAuth();
  await assertOwnsTrip(userId, tripId);
  await assertOwnsLocation(userId, locationId);
  const maxOrder = await prisma.tripLocation.aggregate({
    where: { tripId },
    _max: { sortOrder: true },
  });
  await prisma.tripLocation.create({
    data: { tripId, locationId, sortOrder: (maxOrder._max.sortOrder ?? 0) + 1 },
  });
  revalidateAppPaths(`/trips/${tripId}`, "/trips");
}

export async function removeLocationFromTrip(tripId: string, locationId: string) {
  const userId = await requireAuth();
  await assertOwnsTrip(userId, tripId);
  await prisma.tripLocation.deleteMany({ where: { tripId, locationId } });
  revalidateAppPaths(`/trips/${tripId}`, "/trips");
}

export async function reorderTripLocations(
  tripId: string,
  orderedIds: string[]
) {
  const userId = await requireAuth();
  await assertOwnsTrip(userId, tripId);
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

/**
 * Deep-copy trip stops into the caller's atlas — never alias foreign locationIds.
 * Open links require `shareToken`; targeted grants / owner work without it.
 */
export async function cloneTrip(tripId: string, shareToken?: string) {
  const userId = await requireAuth();
  if (shareToken) {
    await assertCanCloneTripWithToken(userId, tripId, shareToken);
  } else {
    await assertCanCloneTrip(userId, tripId);
  }

  const source = await prisma.trip.findFirst({
    where: { id: tripId },
    include: {
      locations: {
        where: { location: { deletedAt: null } },
        orderBy: { sortOrder: "asc" },
        include: {
          location: {
            select: {
              title: true,
              description: true,
              latitude: true,
              longitude: true,
              altitude: true,
              address: true,
              privacy: true,
              deletedAt: true,
            },
          },
        },
      },
    },
  });
  if (!source) throw new Error("Trip not found");

  const clone = await prisma.trip.create({
    data: {
      userId,
      name: `${source.name} (עותק)`,
      description: source.description,
      color: source.color,
    },
  });

  for (const stop of source.locations) {
    const loc = stop.location;
    if (!loc || loc.deletedAt || loc.privacy === "SECRET") continue;
    const created = await prisma.location.create({
      data: {
        userId,
        title: loc.title,
        description: loc.description,
        latitude: loc.latitude,
        longitude: loc.longitude,
        altitude: loc.altitude,
        address: loc.address,
        privacy: "PRIVATE",
      },
    });
    await prisma.tripLocation.create({
      data: {
        tripId: clone.id,
        locationId: created.id,
        sortOrder: stop.sortOrder,
        notes: stop.notes,
      },
    });
  }

  revalidateAppPaths("/trips", "/locations");
  return clone;
}
