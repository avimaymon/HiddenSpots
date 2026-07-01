"use client";

import { useRouter } from "next/navigation";
import { LocationDetailPanel } from "@/components/map/shared/LocationDetailPanel";

interface Props {
  locationId: string;
  categories: { id: string; name: string; color: string; icon: string }[];
}

export function LocationDetailPageClient({ locationId, categories }: Props) {
  const router = useRouter();
  return (
    <LocationDetailPanel
      locationId={locationId}
      onClose={() => router.push("/locations")}
      categories={categories}
    />
  );
}
