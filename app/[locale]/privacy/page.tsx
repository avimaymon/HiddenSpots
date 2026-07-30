import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppLogo } from "@/components/shared/AppLogo";
import { legalPageMetadata } from "@/lib/seo/metadata";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return legalPageMetadata(locale, "/privacy", "privacyTitle");
}

export default async function PrivacyPage() {
  const t = await getTranslations("legal");
  return (
    <main id="main-content" className="min-h-[100dvh] px-4 py-10 max-w-2xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <AppLogo size="sm" />
        <Link href="/app" className="text-sm text-primary hover:underline">{t("backToApp")}</Link>
      </div>
      <h1 className="text-3xl font-bold mb-4">{t("privacyTitle")}</h1>
      <p className="text-sm text-muted-foreground mb-8">{t("updated")}</p>
      <div className="prose prose-sm dark:prose-invert space-y-4 text-foreground/90 leading-relaxed">
        <p>{t("privacyIntro")}</p>
        <h2 className="text-xl font-semibold mt-6">{t("privacyDataTitle")}</h2>
        <p>{t("privacyData")}</p>
        <h2 className="text-xl font-semibold mt-6">{t("privacyShareTitle")}</h2>
        <p>{t("privacyShare")}</p>
        <h2 className="text-xl font-semibold mt-6">{t("privacyRightsTitle")}</h2>
        <p>{t("privacyRights")}</p>
        <h2 className="text-xl font-semibold mt-6">{t("privacyContactTitle")}</h2>
        <p>{t("privacyContact")}</p>
      </div>
    </main>
  );
}
