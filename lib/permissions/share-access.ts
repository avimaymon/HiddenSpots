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
 * Best active share permission for this user on a location.
 * Accepts: owner (via separate check), targeted ShareGrant, or public token share
 * (sharedWithId null) with permission >= need — for COMMENT/EDIT mutations.
 */
export async function getLocationSharePermission(
  locationId: string,
  userId: string,
  need: Permission
): Promise<Permission | null> {
  const now = new Date();
  const shares = await prisma.share.findMany({
    where: {
      locationId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { permission: true, sharedById: true, sharedWithId: true },
  });

  let best: Permission | null = null;
  for (const s of shares) {
    if (s.sharedById === userId) {
      best = "MANAGE";
      continue;
    }
    // Targeted grant or open public link (sharedWithId null)
    if (s.sharedWithId !== null && s.sharedWithId !== userId) continue;
    if (!permissionAtLeast(s.permission, need)) continue;
    if (!best || permissionAtLeast(s.permission, best)) best = s.permission;
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
