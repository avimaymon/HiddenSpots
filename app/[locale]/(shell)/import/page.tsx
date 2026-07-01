import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { ImportSection } from "@/components/settings/ImportSection";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("import-export");
  return { title: t("title") };
}

export default async function ImportPage() {
  const t = await getTranslations("import-export");
  return (
    <div className="flex flex-col h-full min-h-0 overflow-auto">
      <PageHeader title={t("title")} description={t("description")} />
      <div className="p-4 sm:p-6 max-w-xl">
        <ImportSection />
      </div>
    </div>
  );
}
