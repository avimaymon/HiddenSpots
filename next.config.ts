import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";
import { buildSecurityHeaders, httpsHeadersEnabled } from "./lib/security/headers";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

/**
 * Enforcing CSP + security headers. Defined in lib/security/headers.ts so the
 * production set is locked by a unit test — Next bakes `headers()` into the
 * build manifest, so it cannot be asserted against a running server.
 */
const securityHeaders = buildSecurityHeaders(httpsHeadersEnabled);

const nextConfig: NextConfig = {
  turbopack: {},
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  headers: async () => [
    { source: "/(.*)", headers: securityHeaders },
    {
      source: "/icons/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
    {
      source: "/manifest.json",
      headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
    },
    {
      source: "/llms.txt",
      headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
    },
    {
      source: "/llms-full.txt",
      headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
    },
    {
      source: "/sitemap.xml",
      headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
    },
    {
      source: "/robots.txt",
      headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
    },
  ],
};

export default withSerwist(withNextIntl(nextConfig));
