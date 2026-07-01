"use server";

import { revalidateAppPaths } from "@/lib/revalidate";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { z } from "zod";

const prefsSchema = z.object({
  mapProvider: z.enum(["MAPBOX", "GOOGLE", "LEAFLET"]).optional(),
  mapStyle: z.string().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  defaultPrivacy: z.enum(["PRIVATE", "SHARED", "PUBLIC", "SECRET"]).optional(),
  locale: z.enum(["he", "en"]).optional(),
});

export async function updateUserPreferences(data: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const validated = prefsSchema.parse(data);

  await prisma.user.update({
    where: { id: session.user.id },
    data: validated,
  });

  revalidateAppPaths("/settings");
  return { ok: true };
}

export async function updateLocale(locale: "he" | "en") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await prisma.user.update({ where: { id: session.user.id }, data: { locale } });
  revalidateAppPaths("/settings");
}

export async function markOnboarded() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await prisma.user.update({ where: { id: session.user.id }, data: { onboarded: true } });
}

export async function getUserPreferences() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      mapProvider: true,
      mapStyle: true,
      theme: true,
      defaultPrivacy: true,
      name: true,
      email: true,
      locale: true,
      onboarded: true,
    },
  });
}

export async function getLocationsForExport() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return prisma.location.findMany({
    where: { userId: session.user.id, deletedAt: null },
    select: {
      title: true,
      latitude: true,
      longitude: true,
      altitude: true,
      description: true,
      address: true,
      createdAt: true,
    },
    orderBy: { title: "asc" },
  });
}
