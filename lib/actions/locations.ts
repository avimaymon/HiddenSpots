"use server";

import { revalidateAppPaths } from "@/lib/revalidate";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { activeLocationWhere } from "@/lib/db/filters";
import { locationSchema } from "@/lib/validations/schemas";
import { assertCanEditLocation } from "@/lib/permissions/share-access";
import { assertLocationAccess } from "@/lib/permissions/resource-access";
import {
  stripOwnerOnlyLocationFields,
  redactOwnerOnlyForRead,
} from "@/lib/permissions/owner-only-fields";
import { isAllowedPhotoUrl } from "@/lib/media/photo-url";
import { parseHebrewQuery, hasNlFilters } from "@/lib/search/hebrew-nl";
import type { Prisma } from "@prisma/client";
import {
  ATLAS_LIST_PAGE_SIZE,
  type AtlasListCursor,
} from "@/lib/locations/atlas-list";
import { approxDistanceMeters, DUPE_RADIUS_METERS } from "@/lib/geo/dupe";
import {
  LOCATION_DETAIL_PHOTOS_MAX,
  LOCATION_DETAIL_VISITS_MAX,
  LOCATION_DETAIL_VISIT_PHOTOS_MAX,
} from "@/lib/export/limits";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createLocation(data: unknown) {
  const userId = await requireAuth();
  const validated = locationSchema.parse(data);
  const include = {
    category: true,
    photos: true,
    tags: { include: { tag: true } },
  } as const;

  // Only replayed offline writes carry a clientId, and only they can be
  // deduplicated — a NULL clientId is never equal to itself in Postgres, so it
  // can neither collide nor be looked up. Online creates take the plain path.
  const location = validated.clientId
    ? await prisma.location.upsert({
        where: { userId_clientId: { userId, clientId: validated.clientId } },
        update: {},
        create: { ...validated, userId },
        include,
      })
    : await prisma.location.create({ data: { ...validated, userId }, include });

  revalidateAppPaths("/locations");
  return location;
}

/** Near-duplicate check before create (~DUPE_RADIUS_METERS or same title). */
export async function findNearbyDuplicates(input: {
  title: string;
  latitude: number;
  longitude: number;
}) {
  const userId = await requireAuth();
  const existing = await prisma.location.findMany({
    where: { userId, ...activeLocationWhere },
    select: { id: true, title: true, latitude: true, longitude: true },
    take: 500,
  });
  const titleKey = input.title.trim().toLowerCase();
  const hits = existing.filter((loc) => {
    if (loc.title.trim().toLowerCase() === titleKey) return true;
    return (
      approxDistanceMeters(
        input.latitude,
        input.longitude,
        loc.latitude,
        loc.longitude,
      ) < DUPE_RADIUS_METERS
    );
  });
  return hits.slice(0, 5);
}

export async function updateLocation(id: string, data: unknown) {
  const userId = await requireAuth();
  let isOwner = true;
  try {
    await assertOwns(userId, id);
  } catch {
    isOwner = false;
    await assertCanEditLocation(id, userId);
  }
  const parsed = locationSchema.partial().parse(data);
  // Collaborators must not mutate private notes / privacy settings.
  const validated = isOwner
    ? parsed
    : stripOwnerOnlyLocationFields(parsed as Record<string, unknown>);

  // Record before-state for history
  const before = await prisma.location.findUnique({ where: { id } });

  const location = await prisma.location.update({
    where: { id },
    data: validated,
    include: { category: true, photos: true, tags: { include: { tag: true } } },
  });

  if (before) {
    const snapshot = isOwner
      ? before
      : stripOwnerOnlyLocationFields({ ...before } as Record<string, unknown>);
    await prisma.locationHistory.create({
      data: {
        locationId: id,
        userId,
        snapshot: JSON.parse(JSON.stringify(snapshot)),
      },
    });
  }

  revalidateAppPaths();
  revalidateAppPaths(`/locations/${id}`);
  return location;
}

export async function deleteLocation(id: string) {
  const userId = await requireAuth();
  await assertOwns(userId, id);
  await prisma.location.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidateAppPaths("/locations");
}

export async function getDeletedLocations() {
  const userId = await requireAuth();
  return prisma.location.findMany({
    where: { userId, deletedAt: { not: null } },
    include: {
      category: true,
      photos: { where: { isPrimary: true }, take: 1 },
    },
    orderBy: { deletedAt: "desc" },
    take: 200,
  });
}

export async function restoreLocation(id: string) {
  const userId = await requireAuth();
  const loc = await prisma.location.findFirst({
    where: { id, userId, deletedAt: { not: null } },
  });
  if (!loc) throw new Error("Not found");
  await prisma.location.update({
    where: { id },
    data: { deletedAt: null },
  });
  revalidateAppPaths("/locations", "/settings");
}

export async function permanentlyDeleteLocation(id: string) {
  const userId = await requireAuth();
  const loc = await prisma.location.findFirst({
    where: { id, userId, deletedAt: { not: null } },
  });
  if (!loc) throw new Error("Not found");
  await prisma.location.delete({ where: { id } });
  revalidateAppPaths("/locations", "/settings");
}

export async function toggleFavorite(id: string) {
  const userId = await requireAuth();
  const loc = await assertOwns(userId, id);
  const updated = await prisma.location.update({
    where: { id },
    data: { isFavorite: !loc.isFavorite },
  });
  revalidateAppPaths("/locations");
  return updated.isFavorite;
}

export async function toggleBucketList(id: string) {
  const userId = await requireAuth();
  const loc = await assertOwns(userId, id);
  const updated = await prisma.location.update({
    where: { id },
    data: { isBucketList: !loc.isBucketList },
  });
  revalidateAppPaths("/locations");
  return updated.isBucketList;
}

const atlasListInclude = {
  category: true,
  photos: { where: { isPrimary: true }, take: 1 },
  tags: { include: { tag: true } },
  _count: { select: { visits: true } },
} as const;

/** Cursor page for Locations — honest totalCount + hasMore (no silent truncation). */
export async function getAtlasLocationsPage(opts?: {
  cursor?: AtlasListCursor | null;
  take?: number;
}) {
  const userId = await requireAuth();
  const take = Math.min(Math.max(opts?.take ?? ATLAS_LIST_PAGE_SIZE, 1), 500);
  const where: Prisma.LocationWhereInput = { userId, ...activeLocationWhere };
  const cursor = opts?.cursor;
  if (cursor) {
    const cursorAt = new Date(cursor.updatedAt);
    where.AND = [
      {
        OR: [
          { updatedAt: { lt: cursorAt } },
          { AND: [{ updatedAt: cursorAt }, { id: { lt: cursor.id } }] },
        ],
      },
    ];
  }

  const [totalCount, rows] = await Promise.all([
    prisma.location.count({ where: { userId, ...activeLocationWhere } }),
    prisma.location.findMany({
      where,
      include: atlasListInclude,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: take + 1,
    }),
  ]);

  const hasMore = rows.length > take;
  const locations = hasMore ? rows.slice(0, take) : rows;
  const last = locations[locations.length - 1];
  const nextCursor: AtlasListCursor | null =
    hasMore && last
      ? { updatedAt: last.updatedAt.toISOString(), id: last.id }
      : null;

  return { locations, totalCount, hasMore, nextCursor };
}

export async function getLocations(filters?: {
  search?: string;
  categoryId?: string;
  isFavorite?: boolean;
  isBucketList?: boolean;
  isVisited?: boolean;
  tags?: string[];
}) {
  const userId = await requireAuth();
  return prisma.location.findMany({
    where: {
      userId,
      ...activeLocationWhere,
      ...(filters?.categoryId && { categoryId: filters.categoryId }),
      ...(filters?.isFavorite !== undefined && {
        isFavorite: filters.isFavorite,
      }),
      ...(filters?.isBucketList !== undefined && {
        isBucketList: filters.isBucketList,
      }),
      ...(filters?.isVisited !== undefined && { isVisited: filters.isVisited }),
      ...(filters?.search && {
        OR: [
          { title: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
          { address: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
      ...(filters?.tags?.length && {
        tags: { some: { tag: { name: { in: filters.tags } } } },
      }),
    },
    include: atlasListInclude,
    orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
    // ponytail: legacy callers; atlas UI uses getAtlasLocationsPage
    take: 2000,
  });
}

/** Cap O(n²) pairwise scan — honest truncation when atlas is larger. */
const DUPLICATE_SCAN_MAX = 2000;

/** Lean picker rows for trip/collection stop dialogs (no full atlas dump). */
export async function searchLocationsForPicker(opts?: {
  query?: string;
  excludeIds?: string[];
  take?: number;
}) {
  const userId = await requireAuth();
  const take = Math.min(Math.max(opts?.take ?? 50, 1), 100);
  const q = opts?.query?.trim();
  const excludeIds = opts?.excludeIds?.filter(Boolean) ?? [];

  return prisma.location.findMany({
    where: {
      userId,
      ...activeLocationWhere,
      ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      latitude: true,
      longitude: true,
      category: { select: { color: true } },
    },
    orderBy: q ? { title: "asc" } : [{ updatedAt: "desc" }, { title: "asc" }],
    take,
  });
}

export async function findDuplicateSpotsAction() {
  const userId = await requireAuth();
  const where = { userId, ...activeLocationWhere };
  const total = await prisma.location.count({ where });
  const locs = await prisma.location.findMany({
    where,
    select: { id: true, title: true, latitude: true, longitude: true },
    orderBy: { updatedAt: "desc" },
    take: DUPLICATE_SCAN_MAX,
  });
  const scanned = locs.length;
  const truncated = total > scanned;
  const groups: (typeof locs)[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < locs.length; i++) {
    if (seen.has(locs[i].id)) continue;
    const group = [locs[i]];
    for (let j = i + 1; j < locs.length; j++) {
      if (seen.has(locs[j].id)) continue;
      const titleMatch =
        locs[i].title.toLowerCase().trim() ===
        locs[j].title.toLowerCase().trim();
      const dist = approxDistanceMeters(
        locs[i].latitude,
        locs[i].longitude,
        locs[j].latitude,
        locs[j].longitude,
      );
      if (titleMatch || dist < DUPE_RADIUS_METERS) {
        group.push(locs[j]);
        seen.add(locs[j].id);
      }
    }
    if (group.length > 1) {
      groups.push(group);
      seen.add(locs[i].id);
    }
  }
  return { groups, scanned, total, truncated };
}

export async function mergeLocations(keepId: string, deleteId: string) {
  const userId = await requireAuth();
  await assertOwns(userId, keepId);
  await assertOwns(userId, deleteId);
  if (keepId === deleteId) throw new Error("Invalid merge");

  // Read the overlaps first, outside the transaction: they only determine
  // which memberships move and which are dropped, and keeping the reads out
  // keeps the write window short.
  const [loserCols, loserStops] = await Promise.all([
    prisma.collectionLocation.findMany({
      where: { locationId: deleteId },
      select: { collectionId: true },
    }),
    prisma.tripLocation.findMany({
      where: { locationId: deleteId },
      select: { id: true, tripId: true },
    }),
  ]);

  const [sharedCols, sharedTrips] = await Promise.all([
    loserCols.length
      ? prisma.collectionLocation.findMany({
          where: {
            locationId: keepId,
            collectionId: { in: loserCols.map((c) => c.collectionId) },
          },
          select: { collectionId: true },
        })
      : [],
    loserStops.length
      ? prisma.tripLocation.findMany({
          where: {
            locationId: keepId,
            tripId: { in: loserStops.map((s) => s.tripId) },
          },
          select: { tripId: true },
        })
      : [],
  ]);

  // Where the survivor is already a member, the loser's row is dropped rather
  // than moved — moving it would violate the (collection, location) unique.
  const dupeColIds = new Set(sharedCols.map((c) => c.collectionId));
  const dupeTripIds = new Set(sharedTrips.map((s) => s.tripId));

  const colsToDrop = loserCols.filter((c) => dupeColIds.has(c.collectionId));
  const colsToMove = loserCols.filter((c) => !dupeColIds.has(c.collectionId));
  const stopsToDrop = loserStops.filter((s) => dupeTripIds.has(s.tripId));
  const stopsToMove = loserStops.filter((s) => !dupeTripIds.has(s.tripId));

  /**
   * One transaction. A merge previously ran as ~8 statements plus two per
   * membership row, each committing on its own: a failure part-way through
   * left the loser still visible with half its visits, photos and trip stops
   * already reassigned to the survivor, and no way to tell how far it got.
   *
   * The per-row loops are also collapsed into set-based statements — six
   * statements regardless of size, instead of 8+2N round trips to Neon.
   */
  // Batch form: no `timeout` option exists for it, and none is needed — the
  // statements are sent together and never wait on application code.
  await prisma.$transaction([
    prisma.visit.updateMany({
      where: { locationId: deleteId },
      data: { locationId: keepId },
    }),
    prisma.locationPhoto.updateMany({
      where: { locationId: deleteId },
      data: { locationId: keepId },
    }),
    prisma.collectionLocation.deleteMany({
      where: {
        locationId: deleteId,
        collectionId: { in: colsToDrop.map((c) => c.collectionId) },
      },
    }),
    prisma.collectionLocation.updateMany({
      where: {
        locationId: deleteId,
        collectionId: { in: colsToMove.map((c) => c.collectionId) },
      },
      data: { locationId: keepId },
    }),
    prisma.tripLocation.deleteMany({
      where: { id: { in: stopsToDrop.map((s) => s.id) } },
    }),
    prisma.tripLocation.updateMany({
      where: { id: { in: stopsToMove.map((s) => s.id) } },
      data: { locationId: keepId },
    }),
    prisma.location.update({
      where: { id: deleteId },
      data: { deletedAt: new Date() },
    }),
  ]);

  revalidateAppPaths("/locations", "/settings", "/trips", "/collections");
}

export async function searchLocationsQuick(
  query: string,
  opts?: { lat?: number; lng?: number },
) {
  const userId = await requireAuth();
  const nl = parseHebrewQuery(query);
  const where: Prisma.LocationWhereInput = {
    userId,
    ...activeLocationWhere,
  };

  if (hasNlFilters(nl)) {
    if (nl.categoryNameEn || nl.categoryNameHe) {
      where.category = {
        OR: [
          ...(nl.categoryNameEn ? [{ name: nl.categoryNameEn }] : []),
          ...(nl.categoryNameHe ? [{ nameHe: nl.categoryNameHe }] : []),
        ],
      };
    }
    if (nl.isFavorite === true) where.isFavorite = true;
    if (nl.isBucketList === true) where.isBucketList = true;
    if (nl.isVisited !== undefined) where.isVisited = nl.isVisited;
    if (nl.isDogFriendly) where.isDogFriendly = true;
    if (nl.isFamilyFriendly) where.isFamilyFriendly = true;
    if (nl.isCampingAllowed) where.isCampingAllowed = true;
    if (nl.hasParking) where.hasParking = true;
    if (nl.hasWater) where.hasWater = true;
    if (nl.hasShade) where.hasShade = true;
    if (nl.region) {
      where.latitude = { gte: nl.region.minLat, lte: nl.region.maxLat };
      where.longitude = { gte: nl.region.minLng, lte: nl.region.maxLng };
    }
    if (nl.text) {
      where.OR = [
        { title: { contains: nl.text, mode: "insensitive" } },
        { description: { contains: nl.text, mode: "insensitive" } },
        { address: { contains: nl.text, mode: "insensitive" } },
      ];
    }
  } else {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { address: { contains: query, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.location.findMany({
    where,
    select: {
      id: true,
      title: true,
      latitude: true,
      longitude: true,
      category: { select: { name: true, color: true } },
    },
    take: nl.nearby && opts?.lat != null && opts?.lng != null ? 40 : 8,
    orderBy: { updatedAt: "desc" },
  });

  if (nl.nearby && opts?.lat != null && opts?.lng != null) {
    const lat = opts.lat;
    const lng = opts.lng;
    const maxM = 25_000;
    return rows
      .map((r) => {
        const dLat = (r.latitude - lat) * 111_320;
        const dLng =
          (r.longitude - lng) * 111_320 * Math.cos((lat * Math.PI) / 180);
        const distanceM = Math.hypot(dLat, dLng);
        return { id: r.id, title: r.title, category: r.category, distanceM };
      })
      .filter((r) => r.distanceM <= maxM)
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, 8)
      .map(({ id, title, category }) => ({ id, title, category }));
  }

  return rows
    .slice(0, 8)
    .map(({ id, title, category }) => ({ id, title, category }));
}

export async function getRandomLocation() {
  const userId = await requireAuth();
  const count = await prisma.location.count({
    where: { userId, ...activeLocationWhere },
  });
  if (!count) return null;
  const skip = Math.floor(Math.random() * count);
  const results = await prisma.location.findMany({
    where: { userId, ...activeLocationWhere },
    select: { id: true, title: true, latitude: true, longitude: true },
    take: 1,
    skip,
  });
  return results[0] ?? null;
}

/**
 * A spot's detail page, for its owner or anyone holding a share on it.
 *
 * This was owner-scoped while `updateLocation` accepted EDIT grants, so a
 * collaborator could successfully save changes to a spot whose page returned
 * 404 for them — the permission model disagreed with itself depending on
 * direction. Enforcing on the read path too is the point.
 *
 * A collaborator does not get the owner's view of it: the owner-only fields
 * are stripped (privateNotes above all), and visits are narrowed to the
 * requester's own, since a visit log is a personal diary rather than shared
 * metadata about the place.
 */
export async function getLocationById(id: string) {
  const userId = await requireAuth();

  let isOwner = true;
  let canEdit = true;
  let canComment = true;
  try {
    await assertOwns(userId, id);
  } catch {
    isOwner = false;
    try {
      await assertLocationAccess(userId, id, "VIEW");
    } catch {
      // Same null the owner-scoped query returned for a missing spot, so this
      // does not become an oracle for which ids exist.
      return null;
    }
    // Opening the page no longer implies being able to change it, so the
    // viewer's capabilities are reported alongside the spot. Without them the
    // UI would offer a VIEW collaborator controls that fail server-side —
    // worse than the 404 this replaced, because it looks like it worked until
    // it doesn't. Each mirrors what the corresponding action actually asserts.
    [canEdit, canComment] = await Promise.all([
      assertLocationAccess(userId, id, "EDIT").then(
        () => true,
        () => false
      ),
      assertLocationAccess(userId, id, "COMMENT").then(
        () => true,
        () => false
      ),
    ]);
  }

  const location = await prisma.location.findFirst({
    where: { id, ...activeLocationWhere, ...(isOwner ? { userId } : {}) },
    include: {
      category: true,
      // Caps on a page rendered for every spot. Unbounded, a well-used spot
      // pulled its entire visit history — with each visit's photos — into a
      // serverless response on every view. `_count` still reports the true
      // total, so the UI shows the real number rather than the page size.
      photos: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: LOCATION_DETAIL_PHOTOS_MAX,
      },
      tags: { include: { tag: true } },
      visits: {
        where: isOwner ? undefined : { userId },
        include: { photos: { take: LOCATION_DETAIL_VISIT_PHOTOS_MAX } },
        orderBy: { visitedAt: "desc" },
        take: LOCATION_DETAIL_VISITS_MAX,
      },
      _count: { select: { visits: true } },
    },
  });

  if (!location) return null;
  // `viewerIsOwner` gates the owner-only actions: delete, share, and the
  // favourite / bucket-list / collection / trip controls, all of which either
  // write to the owner's row or assert ownership of the spot.
  if (isOwner) {
    return {
      ...location,
      viewerIsOwner: true,
      viewerCanEdit: true,
      viewerCanComment: true,
    };
  }

  return {
    ...redactOwnerOnlyForRead(location),
    viewerIsOwner: false,
    viewerCanEdit: canEdit,
    viewerCanComment: canComment,
  };
}

export async function addLocationPhoto(
  locationId: string,
  url: string,
  isPrimary = false,
  /** Offline blob id; makes a replayed upload return the original row. */
  clientId?: string,
) {
  const userId = await requireAuth();
  await assertOwns(userId, locationId);
  if (!isAllowedPhotoUrl(url)) throw new Error("Invalid photo URL");

  const findReplay = () =>
    clientId
      ? prisma.locationPhoto.findUnique({ where: { clientId } })
      : Promise.resolve(null);

  let photo = await findReplay();

  if (!photo) {
    try {
      // One transaction: demoting the previous primary, inserting, and moving
      // the cover have to agree. Run apart, a failure between them left the
      // spot with either no primary photo or two.
      photo = await prisma.$transaction(async (tx) => {
        if (isPrimary) {
          await tx.locationPhoto.updateMany({
            where: { locationId },
            data: { isPrimary: false },
          });
        }
        const created = await tx.locationPhoto.create({
          data: { locationId, url, isPrimary, clientId: clientId ?? null },
        });
        if (isPrimary) {
          await tx.location.update({
            where: { id: locationId },
            data: { coverPhotoUrl: url },
          });
        }
        return created;
      });
    } catch (e) {
      // Raced with another replay of the same upload; read the winner's row.
      if ((e as { code?: string }).code !== "P2002") throw e;
      photo = await findReplay();
      if (!photo) throw e;
    }
  }

  revalidateAppPaths("/locations");
  revalidateAppPaths(`/locations/${locationId}`);
  return photo;
}

export async function addTagToLocation(locationId: string, tagName: string) {
  const userId = await requireAuth();
  await assertOwns(userId, locationId);
  const tag = await prisma.tag.upsert({
    where: { name_userId: { name: tagName.toLowerCase(), userId } },
    create: { name: tagName.toLowerCase(), userId },
    update: {},
  });
  await prisma.tagOnLocation.upsert({
    where: { locationId_tagId: { locationId, tagId: tag.id } },
    create: { locationId, tagId: tag.id },
    update: {},
  });
  revalidateAppPaths(`/locations/${locationId}`);
}

export async function removeTagFromLocation(locationId: string, tagId: string) {
  const userId = await requireAuth();
  await assertOwns(userId, locationId);
  await prisma.tagOnLocation.delete({
    where: { locationId_tagId: { locationId, tagId } },
  });
  revalidateAppPaths(`/locations/${locationId}`);
}

export async function getLocationHistory(locationId: string) {
  const userId = await requireAuth();
  await assertOwns(userId, locationId);
  return prisma.locationHistory.findMany({
    where: { locationId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

async function assertOwns(userId: string, locationId: string) {
  const loc = await prisma.location.findFirst({
    where: { id: locationId, userId, ...activeLocationWhere },
  });
  if (!loc) throw new Error("Not found");
  return loc;
}

/** Idempotent favorite for offline sync (toggle replay desyncs). */
export async function setFavorite(id: string, value: boolean) {
  const userId = await requireAuth();
  await assertOwns(userId, id);
  const updated = await prisma.location.update({
    where: { id },
    data: { isFavorite: value },
  });
  revalidateAppPaths("/locations");
  return updated.isFavorite;
}
