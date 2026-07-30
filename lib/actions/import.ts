"use server";

import { revalidateAppPaths } from "@/lib/revalidate";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { locationSchema } from "@/lib/validations/schemas";
import type { LocationFormData } from "@/lib/validations/schemas";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

const DUPE_RADIUS_METERS = 50;

function approxDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  return R * Math.sqrt(dLat * dLat + dLng * dLng);
}

export async function importLocations(
  items: Partial<LocationFormData>[]
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const userId = await requireAuth();
  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  // Load existing locations to check for near-duplicates (same title OR within ~50m)
  const existing = await prisma.location.findMany({
    where: { userId, deletedAt: null },
    select: { title: true, latitude: true, longitude: true },
  });
  const existingTitles = new Set(existing.map((ex) => ex.title.trim().toLowerCase()));

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      if (item.latitude == null || item.longitude == null) {
        errors.push(`Row ${i + 1}: missing coordinates`);
        continue;
      }
      const title = (item.title ?? `Imported spot ${i + 1}`).trim();
      const titleKey = title.toLowerCase();
      const nearExisting = existing.some(
        (ex) =>
          approxDistanceMeters(item.latitude!, item.longitude!, ex.latitude, ex.longitude) <
          DUPE_RADIUS_METERS
      );
      if (existingTitles.has(titleKey) || nearExisting) {
        skipped++;
        continue;
      }
      const validated = locationSchema.parse({
        title,
        latitude: item.latitude,
        longitude: item.longitude,
        description: item.description,
        altitude: item.altitude,
        address: item.address,
        privacy: "PRIVATE",
        isFavorite: false,
        isBucketList: false,
        fuzzyCoordinates: false,
        fuzzyRadiusMeters: 500,
        recommendedSeasons: [],
        externalLinks: [],
      });
      const loc = await prisma.location.create({ data: { ...validated, userId } });
      existing.push({ title: loc.title, latitude: loc.latitude, longitude: loc.longitude });
      existingTitles.add(loc.title.trim().toLowerCase());
      created++;
    } catch (e) {
      errors.push(`Row ${i + 1}: ${String(e)}`);
    }
  }

  revalidateAppPaths("/locations", "/dashboard");
  return { created, skipped, errors };
}

export async function exportLocationsAsGeoJson(userId: string) {
  const locations = await prisma.location.findMany({
    where: { userId, deletedAt: null },
    include: { category: true, tags: { include: { tag: true } } },
  });

  return {
    type: "FeatureCollection",
    features: locations.map((loc) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [loc.longitude, loc.latitude] },
      properties: {
        name: loc.title,
        description: loc.description,
        category: loc.category?.name,
        tags: loc.tags.map((t) => t.tag.name).join(","),
        isFavorite: loc.isFavorite,
        isVisited: loc.isVisited,
        createdAt: loc.createdAt.toISOString(),
      },
    })),
  };
}

export async function exportLocationsAsCsv(userId: string) {
  const locations = await prisma.location.findMany({
    where: { userId, deletedAt: null },
    include: { category: true, tags: { include: { tag: true } } },
  });

  const header = "name,latitude,longitude,category,description,tags,isFavorite,isVisited,createdAt";
  const rows = locations.map((loc) => {
    const row = [
      JSON.stringify(loc.title),
      loc.latitude,
      loc.longitude,
      JSON.stringify(loc.category?.name ?? ""),
      JSON.stringify(loc.description ?? ""),
      JSON.stringify(loc.tags.map((t) => t.tag.name).join(";")),
      loc.isFavorite,
      loc.isVisited,
      loc.createdAt.toISOString(),
    ];
    return row.join(",");
  });

  return [header, ...rows].join("\n");
}
