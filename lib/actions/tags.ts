"use server";

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { revalidateAppPaths } from "@/lib/revalidate";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

const TAGS_LIST_MAX = 500;

export async function getTagsForUser() {
  const userId = await requireAuth();
  return prisma.tag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: { _count: { select: { locations: true } } },
    take: TAGS_LIST_MAX,
  });
}

export async function addTagToLocation(locationId: string, tagName: string) {
  const userId = await requireAuth();
  const location = await prisma.location.findFirst({ where: { id: locationId, userId } });
  if (!location) throw new Error("Location not found");

  const tag = await prisma.tag.upsert({
    where: { name_userId: { name: tagName.toLowerCase().trim(), userId } },
    create: { name: tagName.toLowerCase().trim(), userId },
    update: {},
  });

  await prisma.tagOnLocation.upsert({
    where: { locationId_tagId: { locationId, tagId: tag.id } },
    create: { locationId, tagId: tag.id },
    update: {},
  });

  revalidateAppPaths("/locations");
  return tag;
}

export async function removeTagFromLocation(locationId: string, tagId: string) {
  const userId = await requireAuth();
  const location = await prisma.location.findFirst({ where: { id: locationId, userId } });
  if (!location) throw new Error("Location not found");

  await prisma.tagOnLocation.delete({
    where: { locationId_tagId: { locationId, tagId } },
  });

  revalidateAppPaths("/locations");
}
