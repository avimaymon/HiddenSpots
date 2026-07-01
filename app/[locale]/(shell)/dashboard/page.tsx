import { Metadata } from "next";
import { getDashboardStats } from "@/lib/actions/visits";
import { DashboardClientPage } from "@/components/dashboard/DashboardClientPage";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  return <DashboardClientPage stats={stats} />;
}
