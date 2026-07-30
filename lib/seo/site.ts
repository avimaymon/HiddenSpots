import { routing, type Locale } from "@/i18n/routing";

export const SITE_NAME = "HiddenSpots";

export const SITE_DESCRIPTIONS: Record<Locale, string> = {
  he: "האטלס האישי שלך לפינות טבע נסתרות — מעיינות, מפלים ושבילים. עברית-ראשון, מפה-ראשון, מוכן לשטח גם בלי רשת.",
  en: "Your personal atlas of nature's hidden gems — springs, waterfalls, and trails. Hebrew-first, map-first, field-ready offline.",
};

export const OG_LOCALE: Record<Locale, string> = {
  he: "he_IL",
  en: "en_US",
};

/** Absolute site origin for canonicals, OG, sitemap. */
export function getSiteUrl(): string {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

/** Path without locale prefix, e.g. `/privacy` or `/`. */
export function buildLocaleAlternates(pathWithoutLocale: string = "/") {
  const path =
    pathWithoutLocale === "/" ? "" : pathWithoutLocale.replace(/\/$/, "");
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = absoluteUrl(`/${locale}${path}`);
  }
  languages["x-default"] = absoluteUrl(`/${routing.defaultLocale}${path}`);
  return {
    canonical: undefined as string | undefined,
    languages,
  };
}

export function buildPageAlternates(locale: string, pathWithoutLocale: string = "/") {
  const path =
    pathWithoutLocale === "/" ? "" : pathWithoutLocale.replace(/\/$/, "");
  const alts = buildLocaleAlternates(pathWithoutLocale);
  return {
    canonical: absoluteUrl(`/${locale}${path}`),
    languages: alts.languages,
  };
}
