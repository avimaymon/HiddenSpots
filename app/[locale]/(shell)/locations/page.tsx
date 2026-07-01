import { Metadata } from "next";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { activeLocationWhere } from "@/lib/db/filters";
import { getCategoriesForUser } from "@/lib/queries/categories";
import { LocationsClientPage } from "@/components/locations/LocationsClientPage";

export const metadata: Metadata = { title: "Locations" };

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [locations, categories] = await Promise.all([
    prisma.location.findMany({
      where: { userId, ...activeLocationWhere },
      include: {
        category: true,
        photos: { where: { isPrimary: true }, take: 1 },
        tags: { include: { tag: true } },
        _count: { select: { visits: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    getCategoriesForUser(userId),
  ]);

  return <LocationsClientPage initialLocations={locations} categories={categories} />;
}
