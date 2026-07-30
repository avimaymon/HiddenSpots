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
  return legalPageMetadata(locale, "/terms", "termsTitle");
}

export default async function TermsPage() {
  const t = await getTranslations("legal");
  return (
    <main id="main-content" className="min-h-[100dvh] px-4 py-10 max-w-2xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <AppLogo size="sm" />
        <Link href="/app" className="text-sm text-primary hover:underline">{t("backToApp")}</Link>
      </div>
      <h1 className="text-3xl font-bold mb-4">{t("termsTitle")}</h1>
      <p className="text-sm text-muted-foreground mb-8">{t("updated")}</p>
      <div className="prose prose-sm dark:prose-invert space-y-4 text-foreground/90 leading-relaxed">
        <p>{t("termsIntro")}</p>
        <h2 className="text-xl font-semibold mt-6">{t("termsUseTitle")}</h2>
        <p>{t("termsUse")}</p>
        <h2 className="text-xl font-semibold mt-6">{t("termsContentTitle")}</h2>
        <p>{t("termsContent")}</p>
        <h2 className="text-xl font-semibold mt-6">{t("termsLiabilityTitle")}</h2>
        <p>{t("termsLiability")}</p>
      </div>
    </main>
  );
}
