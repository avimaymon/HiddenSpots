import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { absoluteUrl } from "@/lib/seo/site";

/** Public, indexable routes (no auth wall). */
const PUBLIC_PATHS = ["", "/signin", "/signup", "/privacy", "/terms"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of PUBLIC_PATHS) {
      entries.push({
        url: absoluteUrl(`/${locale}${path}`),
        lastModified,
        changeFrequency: path === "" ? "weekly" : "monthly",
        priority: path === "" ? 1 : path === "/signin" || path === "/signup" ? 0.7 : 0.5,
        alternates: {
          languages: {
            ...Object.fromEntries(
              routing.locales.map((l) => [l, absoluteUrl(`/${l}${path}`)])
            ),
            "x-default": absoluteUrl(`/${routing.defaultLocale}${path}`),
          },
        },
      });
    }
  }

  return entries;
}
