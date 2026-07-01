import { Metadata } from "next";
import { getUserPreferences } from "@/lib/actions/settings";
import { SettingsClientPage } from "@/components/settings/SettingsClientPage";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const prefs = await getUserPreferences();
  return <SettingsClientPage initialPrefs={prefs} />;
}
