import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getDashboardStats } from "@/lib/actions/visits";
import { getSmartViews } from "@/lib/actions/smart-views";
import { DashboardClientPage } from "@/components/dashboard/DashboardClientPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("dashboard") };
}

export default async function DashboardPage() {
  const [stats, smartViews] = await Promise.all([
    getDashboardStats(),
    getSmartViews(),
  ]);
  return <DashboardClientPage stats={stats} smartViews={smartViews} />;
}
