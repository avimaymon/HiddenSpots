import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/he/signin", "/en/signin"],
      disallow: ["/he/app", "/en/app", "/api/"],
    },
    sitemap: undefined,
  };
}
