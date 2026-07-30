import { Metadata } from "next";
import { getDashboardStats } from "@/lib/actions/visits";
import { getSmartViews } from "@/lib/actions/smart-views";
import { DashboardClientPage } from "@/components/dashboard/DashboardClientPage";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [stats, smartViews] = await Promise.all([
    getDashboardStats(),
    getSmartViews(),
  ]);
  return <DashboardClientPage stats={stats} smartViews={smartViews} />;
}
