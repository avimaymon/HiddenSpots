"use server";

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function getNotifications() {
  const userId = await requireAuth();
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function markAllRead() {
  const userId = await requireAuth();
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}
