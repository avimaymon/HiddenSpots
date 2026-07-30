import { ImageResponse } from "next/og";
import { routing } from "@/i18n/routing";
import { SITE_DESCRIPTIONS, SITE_NAME } from "@/lib/seo/site";
import type { Locale } from "@/i18n/routing";

export const alt = "HiddenSpots";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = (routing.locales.includes(raw as Locale) ? raw : routing.defaultLocale) as Locale;
  const description = SITE_DESCRIPTIONS[locale];
  const isRtl = locale === "he";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(145deg, #0c1410 0%, #143528 45%, #1a4a32 100%)",
          color: "#f8f7f4",
          fontFamily: "system-ui, sans-serif",
          direction: isRtl ? "rtl" : "ltr",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
            opacity: 0.85,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "#2d9b63",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            H
          </div>
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              letterSpacing: -1.5,
              lineHeight: 1.05,
              color: "#7ddea8",
            }}
          >
            {SITE_NAME}
          </div>
          <div style={{ fontSize: 32, lineHeight: 1.35, opacity: 0.92, maxWidth: 820 }}>
            {description}
          </div>
        </div>
        <div style={{ fontSize: 22, opacity: 0.55 }}>
          {isRtl ? "עברית · מפה · אופליין" : "Hebrew-first · map-first · offline"}
        </div>
      </div>
    ),
    { ...size }
  );
}
