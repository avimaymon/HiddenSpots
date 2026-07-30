import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/he",
          "/en",
          "/he/signin",
          "/en/signin",
          "/he/signup",
          "/en/signup",
          "/he/privacy",
          "/en/privacy",
          "/he/terms",
          "/en/terms",
          "/llms.txt",
          "/llms-full.txt",
        ],
        disallow: [
          "/he/app",
          "/en/app",
          "/he/locations",
          "/en/locations",
          "/he/collections",
          "/en/collections",
          "/he/trips",
          "/en/trips",
          "/he/visits",
          "/en/visits",
          "/he/settings",
          "/en/settings",
          "/he/import",
          "/en/import",
          "/he/dashboard",
          "/en/dashboard",
          "/api/",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
