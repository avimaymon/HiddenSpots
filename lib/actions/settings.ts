"use server";

import { revalidateAppPaths } from "@/lib/revalidate";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { del } from "@vercel/blob";
import {
  DELETE_ACCOUNT_BLOBS_MAX,
  EXPORT_COLLECTIONS_MAX,
  EXPORT_LOCATIONS_MAX,
  EXPORT_SHARES_MAX,
  EXPORT_TRACKS_MAX,
  EXPORT_TRIPS_MAX,
  EXPORT_VISITS_MAX,
} from "@/lib/export/limits";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const prefsSchema = z.object({
  mapProvider: z.enum(["MAPBOX", "GOOGLE", "LEAFLET"]).optional(),
  mapStyle: z.string().optional(),
  theme: z.enum(["light", "dark", "system", "sun"]).optional(),
  defaultPrivacy: z.enum(["PRIVATE", "SHARED", "PUBLIC", "SECRET"]).optional(),
  locale: z.enum(["he", "en"]).optional(),
  fontSize: z.enum(["default", "large", "xl"]).optional(),
});

export async function updateUserPreferences(data: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const validated = prefsSchema.parse(data);

  await prisma.user.update({
    where: { id: session.user.id },
    data: validated,
  });

  revalidateAppPaths("/settings");
  return { ok: true };
}

export async function updateLocale(locale: "he" | "en") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await prisma.user.update({ where: { id: session.user.id }, data: { locale } });
  revalidateAppPaths("/settings");
}

export async function markOnboarded() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const { seedStarterCollections } = await import("@/lib/auth/starter-collections");
  await seedStarterCollections(prisma, session.user.id);
  await prisma.user.update({ where: { id: session.user.id }, data: { onboarded: true } });
}

export async function getUserPreferences() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      mapProvider: true,
      mapStyle: true,
      theme: true,
      defaultPrivacy: true,
      name: true,
      email: true,
      locale: true,
      onboarded: true,
      fontSize: true,
    },
  });
}

export async function getLocationsForExport() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return prisma.location.findMany({
    where: { userId: session.user.id, deletedAt: null },
    select: {
      title: true,
      latitude: true,
      longitude: true,
      altitude: true,
      description: true,
      address: true,
      createdAt: true,
    },
    orderBy: { title: "asc" },
    take: EXPORT_LOCATIONS_MAX,
  });
}

/** Full GDPR data export — returns all user data as a JSON blob */
export async function exportAllUserData() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const { ok } = await rateLimit(`gdpr-export:${userId}`, 3, 60 * 60 * 1000, {
    failClosed: true,
  });
  if (!ok) throw new Error("RATE_LIMITED");

  const [
    user,
    locationTotal,
    locations,
    visitTotal,
    visits,
    collectionTotal,
    collections,
    tripTotal,
    trips,
    shareTotal,
    shares,
    trackTotal,
    tracks,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, locale: true, createdAt: true },
    }),
    prisma.location.count({ where: { userId, deletedAt: null } }),
    prisma.location.findMany({
      where: { userId, deletedAt: null },
      include: {
        category: { select: { name: true } },
        photos: { select: { url: true } },
        tags: { include: { tag: true } },
      },
      take: EXPORT_LOCATIONS_MAX,
      orderBy: { createdAt: "asc" },
    }),
    prisma.visit.count({ where: { userId } }),
    prisma.visit.findMany({
      where: { userId },
      orderBy: { visitedAt: "desc" },
      take: EXPORT_VISITS_MAX,
    }),
    prisma.collection.count({ where: { userId } }),
    prisma.collection.findMany({ where: { userId }, take: EXPORT_COLLECTIONS_MAX }),
    prisma.trip.count({ where: { userId } }),
    prisma.trip.findMany({
      where: { userId },
      include: { locations: { include: { location: { select: { title: true } } } } },
      take: EXPORT_TRIPS_MAX,
    }),
    prisma.share.count({ where: { sharedById: userId } }),
    prisma.share.findMany({
      where: { sharedById: userId },
      select: { publicToken: true, createdAt: true, viewCount: true },
      take: EXPORT_SHARES_MAX,
    }),
    prisma.track.count({ where: { userId } }),
    prisma.track.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        locationId: true,
        distance: true,
        duration: true,
        points: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: EXPORT_TRACKS_MAX,
    }),
  ]);

  const truncated =
    locationTotal > locations.length ||
    visitTotal > visits.length ||
    collectionTotal > collections.length ||
    tripTotal > trips.length ||
    shareTotal > shares.length ||
    trackTotal > tracks.length;

  return {
    exportedAt: new Date().toISOString(),
    truncated,
    totals: {
      locations: locationTotal,
      visits: visitTotal,
      collections: collectionTotal,
      trips: tripTotal,
      shares: shareTotal,
      tracks: trackTotal,
    },
    limits: {
      locations: EXPORT_LOCATIONS_MAX,
      visits: EXPORT_VISITS_MAX,
      collections: EXPORT_COLLECTIONS_MAX,
      trips: EXPORT_TRIPS_MAX,
      shares: EXPORT_SHARES_MAX,
      tracks: EXPORT_TRACKS_MAX,
    },
    omitted: ["comments", "photoBlobBytes", "driveTokens"] as const,
    user,
    locations,
    visits,
    collections,
    trips,
    shares,
    tracks,
  };
}

/** Permanently delete account and all user data — irreversible */
export async function deleteAccount(confirmEmail: string) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) throw new Error("Unauthorized");
  if (confirmEmail.toLowerCase() !== session.user.email.toLowerCase()) {
    throw new Error("Email confirmation does not match");
  }
  const userId = session.user.id;

  // Blob objects are the one thing the DB cascade cannot reach: deleting the
  // photo rows orphans the uploads forever. Collect the keys first — after the
  // cascade there is nothing left to enumerate them from.
  const [locationPhotos, visitPhotos] = await Promise.all([
    prisma.locationPhoto.findMany({
      where: { location: { userId }, blobKey: { not: null } },
      select: { blobKey: true },
      take: DELETE_ACCOUNT_BLOBS_MAX,
    }),
    prisma.visitPhoto.findMany({
      where: { visit: { userId }, blobKey: { not: null } },
      select: { blobKey: true },
      take: DELETE_ACCOUNT_BLOBS_MAX,
    }),
  ]);
  const blobKeys = [...locationPhotos, ...visitPhotos]
    .map((p) => p.blobKey)
    .filter((k): k is string => Boolean(k));

  // Cascade-delete via Prisma (schema has onDelete: Cascade on userId FKs)
  await prisma.user.delete({ where: { id: userId } });

  // Best-effort: the account is already gone, and a storage hiccup must not
  // turn a completed deletion into an error the user sees.
  let blobsDeleted = 0;
  if (blobKeys.length) {
    try {
      await del(blobKeys);
      blobsDeleted = blobKeys.length;
    } catch (e) {
      console.error(
        JSON.stringify({
          tag: "delete-account.blob-cleanup-failed",
          count: blobKeys.length,
          message: e instanceof Error ? e.message : "unknown",
        })
      );
    }
  }

  return { deleted: true, blobsDeleted, blobsOrphaned: blobKeys.length - blobsDeleted };
}
