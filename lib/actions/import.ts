"use server";

import { revalidateAppPaths } from "@/lib/revalidate";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { locationSchema } from "@/lib/validations/schemas";
import type { LocationFormData } from "@/lib/validations/schemas";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function importLocations(
  items: Partial<LocationFormData>[]
): Promise<{ created: number; errors: string[] }> {
  const userId = await requireAuth();
  const errors: string[] = [];
  let created = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      if (item.latitude == null || item.longitude == null) {
        errors.push(`Row ${i + 1}: missing coordinates`);
        continue;
      }
      const validated = locationSchema.parse({
        title: item.title ?? `Imported spot ${i + 1}`,
        latitude: item.latitude,
        longitude: item.longitude,
        description: item.description,
        altitude: item.altitude,
        address: item.address,
        privacy: "PRIVATE",
        isFavorite: false,
        isBucketList: false,
        fuzzyCoordinates: false,
        fuzzyRadiusMeters: 500,
        recommendedSeasons: [],
        externalLinks: [],
      });
      await prisma.location.create({ data: { ...validated, userId } });
      created++;
    } catch (e) {
      errors.push(`Row ${i + 1}: ${String(e)}`);
    }
  }

  revalidateAppPaths("/locations", "/dashboard");
  return { created, errors };
}
