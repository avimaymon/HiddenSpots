import { Metadata } from "next";
import { getUserPreferences } from "@/lib/actions/settings";
import { getUserCategories } from "@/lib/actions/collections";
import { SettingsClientPage } from "@/components/settings/SettingsClientPage";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [prefs, categories] = await Promise.all([getUserPreferences(), getUserCategories()]);
  return <SettingsClientPage initialPrefs={prefs} categories={categories} />;
}
