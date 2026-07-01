import { Metadata } from "next";
import { getCollections } from "@/lib/actions/collections";
import { CollectionsClientPage } from "@/components/collections/CollectionsClientPage";

export const metadata: Metadata = { title: "Collections" };

export default async function CollectionsPage() {
  const collections = await getCollections();
  return <CollectionsClientPage initialCollections={collections} />;
}
