import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getVisitsPage } from "@/lib/actions/visits";
import { VisitsClientPage } from "@/components/visits/VisitsClientPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("visits") };
}

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
