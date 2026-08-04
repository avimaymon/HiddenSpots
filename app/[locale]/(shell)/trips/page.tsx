import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getTrips } from "@/lib/actions/trips";
import { TripsClientPage } from "@/components/trips/TripsClientPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("trips") };
}

export default async function TripsPage() {
  const trips = await getTrips();
  return <TripsClientPage initialTrips={trips} />;
}
