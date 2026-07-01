import { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/lib/auth/config";
import { getMapPageData } from "@/lib/queries/map-data";
import { MapClientPage } from "@/components/map/MapClientPage";

export const metadata: Metadata = { title: "Map" };

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const data = await getMapPageData(userId);

  return (
    <Suspense fallback={<div className="flex-1 animate-pulse bg-muted/30" />}>
      <MapClientPage
        initialLocations={data.locations}
        collections={data.collections}
        categories={data.categories}
        collectionMembers={data.collectionMembers}
      />
    </Suspense>
  );
}
