import { Metadata } from "next";
import { getCategoriesForUser } from "@/lib/queries/categories";
import { getAtlasLocationsPage } from "@/lib/actions/locations";
import { auth } from "@/lib/auth/config";
import { LocationsClientPage } from "@/components/locations/LocationsClientPage";

export const metadata: Metadata = { title: "Locations" };

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [page, categories] = await Promise.all([
    getAtlasLocationsPage(),
    getCategoriesForUser(userId),
  ]);

  return (
    <LocationsClientPage
      initialLocations={page.locations}
      totalCount={page.totalCount}
      initialHasMore={page.hasMore}
      initialCursor={page.nextCursor}
      categories={categories}
    />
  );
}
