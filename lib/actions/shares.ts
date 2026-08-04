"use server";

import { rateLimit } from "@/lib/rate-limit";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { revalidateAppPaths } from "@/lib/revalidate";
import { shareSchema } from "@/lib/validations/schemas";
import {
  assertOwnsCollection,
  assertOwnsLocation,
  assertOwnsTrip,
  clampOpenSharePermission,
} from "@/lib/permissions/resource-access";
import { writeNotification } from "@/lib/notifications/write";
import { applyPrivacy } from "@/lib/shares/apply-privacy";
import { deriveShareFuzzSeed } from "@/lib/shares/fuzz-seed";
import type { Permission } from "@prisma/client";
import { headers } from "next/headers";

/** Cap gallery size on public location shares (bandwidth + over-share). */
const SHARE_LOCATION_PHOTOS_MAX = 12;

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createShare(data: unknown) {
  const userId = await requireAuth();
  const { ok } = await rateLimit(`share-create:${userId}`, 30, 60_000, {
    failClosed: true,
  });
  if (!ok) throw new Error("RATE_LIMITED");
  // shareSchema enforces exactly one resource, so these guards are exclusive.
  const validated = shareSchema.parse(data);

  if (validated.locationId) await assertOwnsLocation(userId, validated.locationId);
  if (validated.collectionId) await assertOwnsCollection(userId, validated.collectionId);
  if (validated.tripId) await assertOwnsTrip(userId, validated.tripId);

  let sharedWithId: string | undefined;
  if (validated.sharedWithEmail) {
    const target = await prisma.user.findUnique({
      where: { email: validated.sharedWithEmail },
    });
    if (!target) throw new Error("User not found");
    sharedWithId = target.id;
  }

  const permission = clampOpenSharePermission(
    validated.permission as Permission,
    sharedWithId
  );

  const share = await prisma.share.create({
    data: {
      sharedById: userId,
      sharedWithId,
      permission,
      locationId: validated.locationId,
      collectionId: validated.collectionId,
      tripId: validated.tripId,
      expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : undefined,
    },
  });

  if (sharedWithId) {
    const href = share.publicToken ? `/share/${share.publicToken}` : "/app";
    await writeNotification(
      sharedWithId,
      "share",
      "שיתוף חדש ב-HiddenSpots",
      "מישהו שיתף איתך מקום או אוסף",
      href
    ).catch(() => undefined);
  }

  return share;
}

export async function recordShareView(token: string) {
  if (!token || token.length > 128) return;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const { ok } = await rateLimit(`share-view:${token}:${ip}`, 30, 60_000, {
    failClosed: true,
  });
  if (!ok) return;

  await prisma.share.updateMany({
    where: { publicToken: token },
    data: { viewCount: { increment: 1 } },
  });
}

export async function getShareByToken(token: string) {
  const { ok } = await rateLimit(`share:${token}`, 60, 60_000, { failClosed: true });
  if (!ok) return null;

  const share = await prisma.share.findUnique({
    where: { publicToken: token },
    include: {
      location: {
        include: {
          category: true,
          photos: {
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
            take: SHARE_LOCATION_PHOTOS_MAX,
          },
          tags: { include: { tag: true } },
        },
      },
      collection: {
        include: {
          locations: {
            where: { location: { deletedAt: null } },
            take: 500,
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
            where: { location: { deletedAt: null } },
            orderBy: { sortOrder: "asc" },
            take: 200,
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
  // Soft-deleted primary location — treat share as gone
  if (share.locationId && share.location?.deletedAt) return null;
  return applyPrivacy(share, token, deriveShareFuzzSeed);
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
    take: 500,
  });
}

export async function revokeShare(shareId: string) {
  const userId = await requireAuth();
  await prisma.share.delete({
    where: { id: shareId, sharedById: userId },
  });
  revalidateAppPaths("/locations", "/settings");
}
