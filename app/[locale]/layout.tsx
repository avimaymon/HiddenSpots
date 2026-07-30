import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import {
  SITE_NAME,
  SITE_DESCRIPTIONS,
  OG_LOCALE,
  buildPageAlternates,
  absoluteUrl,
} from "@/lib/seo/site";

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (routing.locales.includes(raw as Locale) ? raw : routing.defaultLocale) as Locale;
  const t = await getTranslations({ locale, namespace: "onboarding" });
  const description = SITE_DESCRIPTIONS[locale];
  const titleDefault = SITE_NAME;
  const alternates = buildPageAlternates(locale, "/");

  return {
    title: {
      default: titleDefault,
      template: `%s — ${SITE_NAME}`,
    },
    description,
    alternates,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      alternateLocale: routing.locales
        .filter((l) => l !== locale)
        .map((l) => OG_LOCALE[l]),
      title: titleDefault,
      description: t("landingHeadline"),
      url: alternates.canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: titleDefault,
      description,
    },
    metadataBase: new URL(absoluteUrl("/")),
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();
  setRequestLocale(locale);
  return children;
}
