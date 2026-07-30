import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { LandingHero } from "@/components/landing/LandingHero";
import { SiteJsonLd } from "@/components/shared/SiteJsonLd";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function LocaleLandingPage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = (routing.locales.includes(raw as Locale) ? raw : routing.defaultLocale) as Locale;
  const session = await auth();
  if (session?.user) {
    redirect(`/${locale}/app`);
  }
  return (
    <>
      <SiteJsonLd locale={locale} />
      <LandingHero />
    </>
  );
}
