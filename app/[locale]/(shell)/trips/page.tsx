import { Metadata } from "next";
import { getTrips } from "@/lib/actions/trips";
import { TripsClientPage } from "@/components/trips/TripsClientPage";

export const metadata: Metadata = { title: "Trips" };

export default async function TripsPage() {
  const trips = await getTrips();
  return <TripsClientPage initialTrips={trips} />;
}
