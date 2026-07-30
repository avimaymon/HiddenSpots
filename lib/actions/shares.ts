"use server";

import { rateLimit } from "@/lib/rate-limit";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { revalidateAppPaths } from "@/lib/revalidate";
import { shareSchema } from "@/lib/validations/schemas";
import { fuzzyCoords } from "@/lib/utils";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createShare(data: unknown) {
  const userId = await requireAuth();
  const validated = shareSchema.parse(data);

  let sharedWithId: string | undefined;
  if (validated.sharedWithEmail) {
    const target = await prisma.user.findUnique({
      where: { email: validated.sharedWithEmail },
    });
    if (!target) throw new Error("User not found");
    sharedWithId = target.id;
  }

  const share = await prisma.share.create({
    data: {
      sharedById: userId,
      sharedWithId,
      permission: validated.permission,
      locationId: validated.locationId,
      collectionId: validated.collectionId,
      tripId: validated.tripId,
      expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : undefined,
    },
  });

  return share;
}

export async function recordShareView(token: string) {
  await prisma.share.updateMany({
    where: { publicToken: token },
    data: { viewCount: { increment: 1 } },
  });
}

export async function getShareByToken(token: string) {
  const { ok } = await rateLimit(`share:${token}`, 60, 60_000);
  if (!ok) return null;

  const share = await prisma.share.findUnique({
    where: { publicToken: token },
    include: {
      location: {
        include: {
          category: true,
          photos: true,
          tags: { include: { tag: true } },
        },
      },
      collection: {
        include: {
          locations: {
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
      },
      trip: {
        include: {
          locations: {
            orderBy: { sortOrder: "asc" },
            include: {
              location: {
                include: { category: true },
              },
            },
          },
        },
      },
    },
  });

  if (!share) return null;
  if (share.expiresAt && share.expiresAt < new Date()) return null;
  return applyPrivacy(share);
}

export async function listMyShares() {
  const userId = await requireAuth();
  return prisma.share.findMany({
    where: { sharedById: userId },
    include: {
      location: { select: { id: true, title: true } },
      collection: { select: { id: true, name: true } },
      trip: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ponytail: any-typed internally; return cast preserves caller inference
function applyPrivacy<T>(share: T): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = share as any;
  if (s.location) {
    const loc = s.location;
    if (loc.privacy === "SECRET" || loc.fuzzyCoordinates) {
      const fuzzed = fuzzyCoords(loc.latitude, loc.longitude, loc.fuzzyRadiusMeters ?? 500);
      return { ...s, location: { ...loc, latitude: fuzzed.latitude, longitude: fuzzed.longitude, address: null } } as T;
    }
  }

  if (s.collection) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedLocations = s.collection.locations.map((cl: any) => {
      const loc = cl.location;
      if (!loc) return cl;
      if (loc.privacy === "SECRET" || loc.fuzzyCoordinates) {
        const fuzzed = fuzzyCoords(loc.latitude, loc.longitude, 500);
        return { ...cl, location: { ...loc, latitude: fuzzed.latitude, longitude: fuzzed.longitude } };
      }
      return cl;
    });
    return { ...s, collection: { ...s.collection, locations: updatedLocations } } as T;
  }

  if (s.trip) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedStops = s.trip.locations.map((stop: any) => {
      const loc = stop.location;
      if (!loc) return stop;
      if (loc.privacy === "SECRET" || loc.fuzzyCoordinates) {
        const fuzzed = fuzzyCoords(loc.latitude, loc.longitude, 500);
        return { ...stop, location: { ...loc, latitude: fuzzed.latitude, longitude: fuzzed.longitude } };
      }
      return stop;
    });
    return { ...s, trip: { ...s.trip, locations: updatedStops } } as T;
  }

  return share;
}

export async function revokeShare(shareId: string) {
  const userId = await requireAuth();
  await prisma.share.delete({
    where: { id: shareId, sharedById: userId },
  });
  revalidateAppPaths("/locations", "/settings");
}
