import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import {
  SITE_NAME,
  SITE_DESCRIPTIONS,
  OG_LOCALE,
  buildPageAlternates,
} from "@/lib/seo/site";

export function resolveLocale(raw: string): Locale {
  return (routing.locales.includes(raw as Locale) ? raw : routing.defaultLocale) as Locale;
}

/** Localized title/description + canonical/hreflang/OG/Twitter for a public path. */
export async function publicPageMetadata(opts: {
  locale: string;
  path: string;
  title: string;
  description?: string;
  robots?: Metadata["robots"];
}): Promise<Metadata> {
  const locale = resolveLocale(opts.locale);
  const description = opts.description ?? SITE_DESCRIPTIONS[locale];
  const alternates = buildPageAlternates(locale, opts.path);

  return {
    title: opts.title,
    description,
    alternates,
    robots: opts.robots,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      alternateLocale: routing.locales
        .filter((l) => l !== locale)
        .map((l) => OG_LOCALE[l]),
      title: opts.title,
      description,
      url: alternates.canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description,
    },
  };
}

export async function authPageMetadata(
  locale: string,
  path: "/signin" | "/signup" | "/forgot-password" | "/reset-password",
  titleKey: "signIn" | "signUp" | "forgotTitle" | "resetTitle"
): Promise<Metadata> {
  const loc = resolveLocale(locale);
  const t = await getTranslations({ locale: loc, namespace: "auth" });
  return publicPageMetadata({
    locale: loc,
    path,
    title: t(titleKey),
    description: t("subtitle"),
    robots: path === "/forgot-password" || path === "/reset-password"
      ? { index: false, follow: false }
      : undefined,
  });
}

export async function legalPageMetadata(
  locale: string,
  path: "/privacy" | "/terms",
  titleKey: "privacyTitle" | "termsTitle"
): Promise<Metadata> {
  const loc = resolveLocale(locale);
  const t = await getTranslations({ locale: loc, namespace: "legal" });
  const introKey = path === "/privacy" ? "privacyIntro" : "termsIntro";
  return publicPageMetadata({
    locale: loc,
    path,
    title: t(titleKey),
    description: t(introKey).slice(0, 160),
  });
}
