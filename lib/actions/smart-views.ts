"use server";

import { revalidateAppPaths } from "@/lib/revalidate";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

const smartViewSchema = z.object({
  name: z.string().min(1).max(100),
  filters: z.record(z.unknown()),
  sortBy: z.string().default("createdAt"),
  icon: z.string().default("sparkles"),
  color: z.string().default("#8b5cf6"),
});

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function getSmartViews() {
  const userId = await requireAuth();
  return prisma.smartView.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function createSmartView(data: unknown) {
  const userId = await requireAuth();
  const validated = smartViewSchema.parse(data);
  const view = await prisma.smartView.create({
    data: {
      ...validated,
      filters: validated.filters as Prisma.InputJsonValue,
      userId,
    },
  });
  revalidateAppPaths("/locations");
  return view;
}

export async function deleteSmartView(id: string) {
  const userId = await requireAuth();
  await prisma.smartView.delete({ where: { id, userId } });
  revalidateAppPaths("/locations");
}
