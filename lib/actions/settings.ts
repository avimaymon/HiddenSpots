"use server";

import { revalidateAppPaths } from "@/lib/revalidate";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { z } from "zod";

const prefsSchema = z.object({
  mapProvider: z.enum(["MAPBOX", "GOOGLE", "LEAFLET"]).optional(),
  mapStyle: z.string().optional(),
  theme: z.enum(["light", "dark", "system", "sun"]).optional(),
  defaultPrivacy: z.enum(["PRIVATE", "SHARED", "PUBLIC", "SECRET"]).optional(),
  locale: z.enum(["he", "en"]).optional(),
  fontSize: z.enum(["default", "large", "xl"]).optional(),
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
      fontSize: true,
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

/** Full GDPR data export — returns all user data as a JSON blob */
export async function exportAllUserData() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const [user, locations, visits, collections, trips, shares] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, locale: true, createdAt: true },
    }),
    prisma.location.findMany({
      where: { userId, deletedAt: null },
      include: { category: { select: { name: true } }, photos: { select: { url: true } }, tags: { include: { tag: true } } },
    }),
    prisma.visit.findMany({ where: { userId }, orderBy: { visitedAt: "desc" } }),
    prisma.collection.findMany({ where: { userId } }),
    prisma.trip.findMany({ where: { userId }, include: { locations: { include: { location: { select: { title: true } } } } } }),
    prisma.share.findMany({ where: { sharedById: userId }, select: { publicToken: true, createdAt: true, viewCount: true } }),
  ]);

  return { exportedAt: new Date().toISOString(), user, locations, visits, collections, trips, shares };
}

/** Permanently delete account and all user data — irreversible */
export async function deleteAccount(confirmEmail: string) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) throw new Error("Unauthorized");
  if (confirmEmail.toLowerCase() !== session.user.email.toLowerCase()) {
    throw new Error("Email confirmation does not match");
  }
  const userId = session.user.id;
  // Cascade-delete via Prisma (schema has onDelete: Cascade on userId FKs)
  await prisma.user.delete({ where: { id: userId } });
  return { deleted: true };
}
