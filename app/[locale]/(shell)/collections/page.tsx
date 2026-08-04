import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCollections } from "@/lib/actions/collections";
import { CollectionsClientPage } from "@/components/collections/CollectionsClientPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("collections") };
}

export default async function CollectionsPage() {
  const collections = await getCollections();
  return <CollectionsClientPage initialCollections={collections} />;
}
