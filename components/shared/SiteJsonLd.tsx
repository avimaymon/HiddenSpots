import { SITE_NAME, SITE_DESCRIPTIONS, absoluteUrl, getSiteUrl } from "@/lib/seo/site";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
}

/** Organization + WebSite JSON-LD for public landing SEO. */
export function SiteJsonLd({ locale }: Props) {
  const origin = getSiteUrl();
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: SITE_NAME,
        url: origin,
        logo: absoluteUrl("/icons/icon-512.png"),
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: SITE_NAME,
        url: absoluteUrl(`/${locale}`),
        description: SITE_DESCRIPTIONS[locale],
        inLanguage: locale,
        publisher: { "@id": `${origin}/#organization` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
