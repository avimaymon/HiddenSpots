"use server";

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { summarizeTrackPoints } from "@/lib/geo/track-stats";
import { revalidateAppPaths } from "@/lib/revalidate";
import { z } from "zod";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

const trackPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  time: z.number().optional(),
});

const saveTrackSchema = z.object({
  name: z.string().max(120).optional(),
  locationId: z.string().min(1).max(64).optional().nullable(),
  points: z.array(trackPointSchema).min(2).max(50_000),
  distance: z.number().nonnegative().optional(),
  duration: z.number().int().nonnegative().optional(),
  gpx: z.string().max(5_000_000).optional(),
});

export async function saveTrack(data: unknown) {
  const userId = await requireAuth();
  const validated = saveTrackSchema.parse(data);

  if (validated.locationId) {
    const loc = await prisma.location.findFirst({
      where: { id: validated.locationId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!loc) throw new Error("Forbidden");
  }

  const stats = summarizeTrackPoints(validated.points);
  const distance = validated.distance ?? stats.distanceKm;
  const duration = validated.duration ?? stats.durationSec ?? undefined;

  const track = await prisma.track.create({
    data: {
      userId,
      locationId: validated.locationId ?? null,
      name: validated.name ?? null,
      points: validated.points,
      distance,
      duration: duration ?? null,
      // ponytail: store GPX inline in points payload ceiling; gpxUrl reserved for blob storage later
      gpxUrl: null,
    },
  });

  revalidateAppPaths("/app");
  return { id: track.id, distance: track.distance, duration: track.duration };
}

export async function getTrackSummaries(limit = 20) {
  const userId = await requireAuth();
  return prisma.track.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
    select: {
      id: true,
      name: true,
      locationId: true,
      distance: true,
      duration: true,
      createdAt: true,
    },
  });
}

export async function getTrackPoints(id: string) {
  const userId = await requireAuth();
  const track = await prisma.track.findFirst({
    where: { id, userId },
    select: { id: true, name: true, points: true, distance: true, duration: true },
  });
  if (!track) throw new Error("Not found");
  const points = z.array(trackPointSchema).parse(track.points);
  return { ...track, points };
}

/** @deprecated prefer getTrackSummaries + getTrackPoints */
export async function getTracks(limit = 20) {
  const userId = await requireAuth();
  return prisma.track.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
    select: {
      id: true,
      name: true,
      locationId: true,
      distance: true,
      duration: true,
      createdAt: true,
      points: true,
    },
  });
}

export async function deleteTrack(id: string) {
  const userId = await requireAuth();
  const track = await prisma.track.findFirst({ where: { id, userId } });
  if (!track) throw new Error("Not found");
  await prisma.track.delete({ where: { id } });
  revalidateAppPaths("/app");
}
