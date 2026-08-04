import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getUserPreferences } from "@/lib/actions/settings";
import { getUserCategories } from "@/lib/actions/collections";
import { SettingsClientPage } from "@/components/settings/SettingsClientPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("settings") };
}

export default async function SettingsPage() {
  const [prefs, categories] = await Promise.all([getUserPreferences(), getUserCategories()]);
  return <SettingsClientPage initialPrefs={prefs} categories={categories} />;
}
