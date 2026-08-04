import { prisma } from "@/lib/db";
import { activeLocationWhere } from "@/lib/db/filters";
import {
  getLocationSharePermission,
  permissionAtLeast,
  targetedShareGrants,
  tokenShareAllowsAccess,
} from "@/lib/permissions/share-access";
import type { Permission } from "@prisma/client";

export class AccessError extends Error {
  constructor(message: "Unauthorized" | "Forbidden" | "Not found") {
    super(message);
    this.name = "AccessError";
  }
}

/** Active (non-deleted) location owned by user. */
export async function assertOwnsLocation(userId: string, locationId: string) {
  const loc = await prisma.location.findFirst({
    where: { id: locationId, userId, ...activeLocationWhere },
  });
  if (!loc) throw new AccessError("Not found");
  return loc;
}

/** Soft-deleted location owned by user (trash restore / purge). */
export async function assertOwnsDeletedLocation(userId: string, locationId: string) {
  const loc = await prisma.location.findFirst({
    where: { id: locationId, userId, deletedAt: { not: null } },
  });
  if (!loc) throw new AccessError("Not found");
  return loc;
}

export async function assertOwnsCollection(userId: string, collectionId: string) {
  const col = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
  });
  if (!col) throw new AccessError("Not found");
  return col;
}

export async function assertOwnsTrip(userId: string, tripId: string) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId },
  });
  if (!trip) throw new AccessError("Not found");
  return trip;
}

/** Targeted (or owner) collection share only — open links excluded. */
async function bestCollectionSharePermission(
  collectionId: string,
  userId: string
): Promise<Permission | null> {
  const now = new Date();
  const shares = await prisma.share.findMany({
    where: {
      collectionId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { permission: true, sharedById: true, sharedWithId: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  let best: Permission | null = null;
  for (const s of shares) {
    if (!targetedShareGrants(s, userId, "VIEW")) continue;
    const effective: Permission =
      s.sharedById === userId ? "MANAGE" : s.permission;
    if (!best || permissionAtLeast(effective, best)) best = effective;
  }
  return best;
}

/** Targeted (or owner) trip share only — open links excluded. */
async function bestTripSharePermission(
  tripId: string,
  userId: string
): Promise<Permission | null> {
  const now = new Date();
  const shares = await prisma.share.findMany({
    where: {
      tripId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { permission: true, sharedById: true, sharedWithId: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  let best: Permission | null = null;
  for (const s of shares) {
    if (!targetedShareGrants(s, userId, "VIEW")) continue;
    const effective: Permission =
      s.sharedById === userId ? "MANAGE" : s.permission;
    if (!best || permissionAtLeast(effective, best)) best = effective;
  }
  return best;
}

/** Owner or share with at least `need` on a location. */
export async function assertLocationAccess(
  userId: string,
  locationId: string,
  need: Permission
) {
  const loc = await prisma.location.findFirst({
    where: { id: locationId, ...activeLocationWhere },
    select: { id: true, userId: true },
  });
  if (!loc) throw new AccessError("Not found");
  if (loc.userId === userId) return loc;
  const perm = await getLocationSharePermission(locationId, userId, need);
  if (!perm) throw new AccessError("Forbidden");
  return loc;
}

/** Owner or targeted collection share with at least VIEW (for clone). */
export async function assertCanCloneCollection(userId: string, collectionId: string) {
  const col = await prisma.collection.findFirst({
    where: { id: collectionId },
    select: { id: true, userId: true },
  });
  if (!col) throw new AccessError("Not found");
  if (col.userId === userId) return col;
  const perm = await bestCollectionSharePermission(collectionId, userId);
  if (!perm || !permissionAtLeast(perm, "VIEW")) throw new AccessError("Forbidden");
  return col;
}

/** Owner or targeted trip share with at least VIEW (for clone). */
export async function assertCanCloneTrip(userId: string, tripId: string) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId },
    select: { id: true, userId: true },
  });
  if (!trip) throw new AccessError("Not found");
  if (trip.userId === userId) return trip;
  const perm = await bestTripSharePermission(tripId, userId);
  if (!perm || !permissionAtLeast(perm, "VIEW")) throw new AccessError("Forbidden");
  return trip;
}

/**
 * Clone via verified share token (open or targeted).
 * Open VIEW+ links authorize any signed-in user who presents the token.
 */
export async function assertCanCloneCollectionWithToken(
  userId: string,
  collectionId: string,
  token: string
) {
  const share = await prisma.share.findUnique({
    where: { publicToken: token },
    select: {
      collectionId: true,
      permission: true,
      sharedById: true,
      sharedWithId: true,
      expiresAt: true,
    },
  });
  if (!share?.collectionId || share.collectionId !== collectionId) {
    throw new AccessError("Forbidden");
  }
  if (!tokenShareAllowsAccess(share, userId, "VIEW")) {
    throw new AccessError("Forbidden");
  }
}

export async function assertCanCloneTripWithToken(
  userId: string,
  tripId: string,
  token: string
) {
  const share = await prisma.share.findUnique({
    where: { publicToken: token },
    select: {
      tripId: true,
      permission: true,
      sharedById: true,
      sharedWithId: true,
      expiresAt: true,
    },
  });
  if (!share?.tripId || share.tripId !== tripId) {
    throw new AccessError("Forbidden");
  }
  if (!tokenShareAllowsAccess(share, userId, "VIEW")) {
    throw new AccessError("Forbidden");
  }
}

/**
 * Clamp open (untargeted) share links to COMMENT max — EDIT/MANAGE need an email grant.
 * Open COMMENT is usable only via token-scoped APIs (not ambient locationId grants).
 */
export function clampOpenSharePermission(
  permission: Permission,
  sharedWithId: string | null | undefined
): Permission {
  if (sharedWithId) return permission;
  if (permissionAtLeast(permission, "EDIT")) return "COMMENT";
  return permission;
}
