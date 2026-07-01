"use server";

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { revalidateAppPaths } from "@/lib/revalidate";
import { shareSchema } from "@/lib/validations/schemas";

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
  return prisma.share.findUnique({
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
}

export async function revokeShare(shareId: string) {
  const userId = await requireAuth();
  await prisma.share.delete({
    where: { id: shareId, sharedById: userId },
  });
  revalidateAppPaths("/locations");
}
