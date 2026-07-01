import { Metadata } from "next";
import { getVisits } from "@/lib/actions/visits";
import { VisitsClientPage } from "@/components/visits/VisitsClientPage";

export const metadata: Metadata = { title: "Visits" };

export default async function VisitsPage() {
  const visits = await getVisits();
  return <VisitsClientPage initialVisits={visits} />;
}
