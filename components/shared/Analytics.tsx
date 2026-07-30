"use client";

import Script from "next/script";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageview } from "@/lib/analytics";
import { getPlausibleDomain } from "@/lib/analytics/plausible";
import { isDoNotTrack } from "@/lib/analytics/scrub";

/**
 * Loads Plausible (cookieless) when configured; tracks SPA navigations.
 * No consent banner needed for Plausible — add one only if GA4/ads arrive later.
 */
export function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const domain = getPlausibleDomain();
  const disabled =
    process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER === "noop" || isDoNotTrack();

  useEffect(() => {
    if (disabled || !domain) return;
    const qs = searchParams?.toString();
    trackPageview(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, searchParams, domain, disabled]);

  if (!domain || disabled) return null;

  return (
    <Script
      defer
      data-domain={domain}
      src="https://plausible.io/js/script.js"
      strategy="afterInteractive"
    />
  );
}
