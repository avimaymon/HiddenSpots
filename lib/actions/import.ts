"use server";

import { revalidateAppPaths } from "@/lib/revalidate";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { IMPORT_LOCATIONS_MAX } from "@/lib/import/limits";
import { DUPE_SCAN_MAX, EXPORT_LOCATIONS_MAX } from "@/lib/export/limits";
import { approxDistanceMeters, DUPE_RADIUS_METERS } from "@/lib/geo/dupe";
import { csvCell } from "@/lib/geo/export";
import { locationSchema } from "@/lib/validations/schemas";
import type { LocationFormData } from "@/lib/validations/schemas";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export type ImportLocationsResult = {
  created: number;
  skipped: number;
  errors: string[];
  truncated: boolean;
  received: number;
  processed: number;
};

export async function importLocations(
  items: Partial<LocationFormData>[]
): Promise<ImportLocationsResult> {
  const userId = await requireAuth();
  const { ok } = await rateLimit(`import:${userId}`, 5, 60_000, { failClosed: true });
  if (!ok) {
    throw new Error("RATE_LIMITED");
  }

  const received = items.length;
  const truncated = received > IMPORT_LOCATIONS_MAX;
  const batch = truncated ? items.slice(0, IMPORT_LOCATIONS_MAX) : items;
  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  if (truncated) {
    errors.push(`TRUNCATED:${IMPORT_LOCATIONS_MAX}`);
  }

  // Load existing locations to check for near-duplicates (same title OR within ~50m)
  const existing = await prisma.location.findMany({
    where: { userId, deletedAt: null },
    select: { title: true, latitude: true, longitude: true },
    take: DUPE_SCAN_MAX,
    orderBy: { updatedAt: "desc" },
  });
  if (existing.length >= DUPE_SCAN_MAX) {
    errors.push(`DUPE_SCAN_TRUNCATED:${DUPE_SCAN_MAX}`);
  }
  const existingTitles = new Set(existing.map((ex) => ex.title.trim().toLowerCase()));

  for (let i = 0; i < batch.length; i++) {
    const item = batch[i];
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
  return {
    created,
    skipped,
    errors,
    truncated,
    received,
    processed: batch.length,
  };
}

/** Fetch Google My Maps as KML and return import preview (no write). */
export async function previewMyMapsUrl(urlOrMid: string): Promise<{
  locations: Partial<LocationFormData>[];
  source: string;
  count: number;
  errors: string[];
  mid: string;
}> {
  await requireAuth();
  const { extractMyMapsMid, myMapsKmlUrl } = await import("@/lib/geo/mymaps");
  const { parseKmlText } = await import("@/lib/geo/import");
  const mid = extractMyMapsMid(urlOrMid);
  if (!mid) {
    return { locations: [], source: "My Maps", count: 0, errors: ["INVALID_MYMAPS_URL"], mid: "" };
  }

  const res = await fetch(myMapsKmlUrl(mid), {
    headers: { "User-Agent": "HiddenSpots/1.0" },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    return {
      locations: [],
      source: "My Maps",
      count: 0,
      errors: [`FETCH_FAILED:${res.status}`],
      mid,
    };
  }
  const text = await res.text();
  const preview = parseKmlText(text);
  return { ...preview, source: "Google My Maps", mid };
}

export async function importMyMapsUrl(urlOrMid: string): Promise<ImportLocationsResult> {
  const preview = await previewMyMapsUrl(urlOrMid);
  if (!preview.count) {
    return {
      created: 0,
      skipped: 0,
      errors: preview.errors.length ? preview.errors : ["EMPTY"],
      truncated: false,
      received: 0,
      processed: 0,
    };
  }
  return importLocations(preview.locations);
}

export async function exportLocationsAsGeoJson() {
  const userId = await requireAuth();
  const locations = await prisma.location.findMany({
    where: { userId, deletedAt: null },
    include: { category: true, tags: { include: { tag: true } } },
    take: EXPORT_LOCATIONS_MAX,
    orderBy: { createdAt: "asc" },
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

export async function exportLocationsAsCsv() {
  const userId = await requireAuth();
  const locations = await prisma.location.findMany({
    where: { userId, deletedAt: null },
    include: { category: true, tags: { include: { tag: true } } },
    take: EXPORT_LOCATIONS_MAX,
    orderBy: { createdAt: "asc" },
  });

  const header = "name,latitude,longitude,category,description,tags,isFavorite,isVisited,createdAt";
  const rows = locations.map((loc) => {
    // csvCell, not JSON.stringify: JSON escapes an embedded quote as \" while
    // CSV requires "", so any title containing a quote produced a file that
    // every spreadsheet parsed wrongly from that column on. It also defuses
    // formula-leading cells.
    const row = [
      csvCell(loc.title),
      loc.latitude,
      loc.longitude,
      csvCell(loc.category?.name ?? ""),
      csvCell(loc.description ?? ""),
      csvCell(loc.tags.map((t) => t.tag.name).join(";")),
      loc.isFavorite,
      loc.isVisited,
      loc.createdAt.toISOString(),
    ];
    return row.join(",");
  });

  return [header, ...rows].join("\n");
}
