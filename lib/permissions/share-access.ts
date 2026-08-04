import { prisma } from "@/lib/db";
import type { Permission } from "@prisma/client";

const RANK: Record<Permission, number> = {
  VIEW: 1,
  COMMENT: 2,
  EDIT: 3,
  MANAGE: 4,
};

export function permissionAtLeast(have: Permission, need: Permission): boolean {
  return RANK[have] >= RANK[need];
}

/**
 * Whether a share row grants `need` to `userId` for ambient (no token) checks.
 * Open links (sharedWithId null) never grant ambient mutations — use token APIs.
 */
export function targetedShareGrants(
  share: {
    permission: Permission;
    sharedById: string;
    sharedWithId: string | null;
  },
  userId: string,
  need: Permission
): boolean {
  if (share.sharedById === userId) return true;
  if (share.sharedWithId === null) return false;
  if (share.sharedWithId !== userId) return false;
  return permissionAtLeast(share.permission, need);
}

/**
 * Best active *targeted* share permission for this user on a location.
 * Open public links (sharedWithId null) are intentionally excluded — prove the
 * share token via token-scoped APIs instead of ambient locationId grants.
 */
export async function getLocationSharePermission(
  locationId: string,
  userId: string,
  need: Permission
): Promise<Permission | null> {
  const now = new Date();
  // Cap share fan-out per location — order newest first so recent grants win scans.
  const shares = await prisma.share.findMany({
    where: {
      locationId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { permission: true, sharedById: true, sharedWithId: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let best: Permission | null = null;
  for (const s of shares) {
    if (!targetedShareGrants(s, userId, need)) continue;
    const effective: Permission =
      s.sharedById === userId ? "MANAGE" : s.permission;
    if (!best || permissionAtLeast(effective, best)) best = effective;
  }
  return best;
}

export async function assertCanComment(locationId: string, userId: string): Promise<void> {
  const loc = await prisma.location.findFirst({
    where: { id: locationId, deletedAt: null },
    select: { userId: true },
  });
  if (!loc) throw new Error("Not found");
  if (loc.userId === userId) return;
  const perm = await getLocationSharePermission(locationId, userId, "COMMENT");
  if (!perm) throw new Error("Forbidden");
}

/**
 * Token-presented share grant (open or targeted).
 * Unlike targetedShareGrants, open links (sharedWithId null) are allowed here.
 */
export function tokenShareAllowsAccess(
  share: {
    permission: Permission;
    sharedById: string;
    sharedWithId: string | null;
    expiresAt: Date | null;
  },
  userId: string,
  need: Permission,
  now = new Date()
): boolean {
  if (share.expiresAt && share.expiresAt < now) return false;
  if (share.sharedById === userId) return true;
  if (share.sharedWithId !== null && share.sharedWithId !== userId) return false;
  return permissionAtLeast(share.permission, need);
}

/**
 * Comment via a verified share token (open or targeted).
 * Open COMMENT links authorize any signed-in user who presents the token.
 */
export async function assertCanCommentWithShareToken(
  locationId: string,
  userId: string,
  token: string
): Promise<void> {
  const share = await prisma.share.findUnique({
    where: { publicToken: token },
    select: {
      locationId: true,
      permission: true,
      sharedById: true,
      sharedWithId: true,
      expiresAt: true,
    },
  });
  if (!share?.locationId || share.locationId !== locationId) {
    throw new Error("Forbidden");
  }
  if (!tokenShareAllowsAccess(share, userId, "COMMENT")) {
    throw new Error("Forbidden");
  }
}

export async function assertCanEditLocation(locationId: string, userId: string): Promise<void> {
  const loc = await prisma.location.findFirst({
    where: { id: locationId, deletedAt: null },
    select: { userId: true },
  });
  if (!loc) throw new Error("Not found");
  if (loc.userId === userId) return;
  const perm = await getLocationSharePermission(locationId, userId, "EDIT");
  if (!perm) throw new Error("Forbidden");
}
