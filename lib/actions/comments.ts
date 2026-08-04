"use server";

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import {
  assertCanComment,
  assertCanCommentWithShareToken,
} from "@/lib/permissions/share-access";
import { assertLocationAccess } from "@/lib/permissions/resource-access";
import { writeNotification } from "@/lib/notifications/write";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function getComments(locationId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await assertLocationAccess(session.user.id, locationId, "VIEW");
  return listComments(locationId);
}

/** Public share page — only after token was validated by the caller. */
export async function getCommentsForShareToken(token: string) {
  const share = await prisma.share.findUnique({
    where: { publicToken: token },
    select: { locationId: true, expiresAt: true },
  });
  if (!share?.locationId) return [];
  if (share.expiresAt && share.expiresAt < new Date()) return [];
  return listComments(share.locationId);
}

function listComments(locationId: string) {
  return prisma.comment.findMany({
    where: { locationId },
    include: { user: { select: { name: true, image: true } } },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
}

async function createCommentForUser(locationId: string, userId: string, body: string) {
  const { ok } = await rateLimit(`comment:${userId}`, 20, 60_000, {
    failClosed: true,
  });
  if (!ok) throw new Error("Too many requests");

  const parsed = z.string().min(1).max(2000).parse(body);
  const comment = await prisma.comment.create({
    data: { locationId, userId, body: parsed },
    include: { user: { select: { name: true, image: true } } },
  });

  const loc = await prisma.location.findFirst({
    where: { id: locationId },
    select: { userId: true, title: true },
  });
  if (loc && loc.userId !== userId) {
    await writeNotification(
      loc.userId,
      "comment",
      "תגובה חדשה",
      comment.user.name ?? "משתמש",
      `/locations/${locationId}`
    ).catch(() => undefined);
  }

  return comment;
}

/** Owner or targeted COMMENT+ grant — not open-link ambient. */
export async function addComment(locationId: string, body: string) {
  const userId = await requireAuth();
  await assertCanComment(locationId, userId);
  return createCommentForUser(locationId, userId, body);
}

/** Share page — proves open/targeted COMMENT via public token. */
export async function addCommentForShareToken(
  token: string,
  locationId: string,
  body: string
) {
  const userId = await requireAuth();
  await assertCanCommentWithShareToken(locationId, userId, token);
  return createCommentForUser(locationId, userId, body);
}

export async function deleteComment(id: string) {
  const userId = await requireAuth();
  const result = await prisma.comment.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new Error("Not found");
}
