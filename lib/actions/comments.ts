"use server";

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { assertCanComment } from "@/lib/permissions/share-access";
import { z } from "zod";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function getComments(locationId: string) {
  return prisma.comment.findMany({
    where: { locationId },
    include: { user: { select: { name: true, image: true } } },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
}

export async function addComment(locationId: string, body: string) {
  const userId = await requireAuth();
  await assertCanComment(locationId, userId);
  const parsed = z.string().min(1).max(2000).parse(body);
  return prisma.comment.create({
    data: { locationId, userId, body: parsed },
    include: { user: { select: { name: true, image: true } } },
  });
}

export async function deleteComment(id: string) {
  const userId = await requireAuth();
  await prisma.comment.delete({ where: { id, userId } });
}
