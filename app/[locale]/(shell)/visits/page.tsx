import { Metadata } from "next";
import { getVisitsPage } from "@/lib/actions/visits";
import { VisitsClientPage } from "@/components/visits/VisitsClientPage";

export const metadata: Metadata = { title: "Visits" };

export default async function VisitsPage() {
  const page = await getVisitsPage();
  return (
    <VisitsClientPage
      initialVisits={page.items}
      totalCount={page.totalCount}
      initialHasMore={page.hasMore}
      initialNextSkip={page.nextSkip}
    />
  );
}
