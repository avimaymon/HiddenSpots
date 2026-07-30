import type { AnalyticsProvider, AnalyticsProps } from "./types";
import { noopProvider } from "./noop";
import { createPlausibleProvider, getPlausibleDomain } from "./plausible";
import { isDoNotTrack, scrubPii } from "./scrub";

let cached: AnalyticsProvider | null = null;

function resolveProvider(): AnalyticsProvider {
  if (typeof window === "undefined") return noopProvider;
  if (cached) return cached;

  const forced = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER?.toLowerCase();
  if (forced === "noop" || isDoNotTrack()) {
    cached = noopProvider;
    return cached;
  }

  const domain = getPlausibleDomain();
  if (domain && (forced === "plausible" || !forced)) {
    cached = createPlausibleProvider(domain);
    return cached;
  }

  cached = noopProvider;
  return cached;
}

/** Privacy-aware event dispatch — DNT + PII scrub before provider. */
export function track(name: string, props?: AnalyticsProps): void {
  if (typeof window === "undefined") return;
  if (isDoNotTrack()) return;
  resolveProvider().event(name, scrubPii(props));
}

export function trackPageview(path: string): void {
  if (typeof window === "undefined") return;
  if (isDoNotTrack()) return;
  resolveProvider().pageview(path);
}

export type { AnalyticsProps, AnalyticsProvider };
export { scrubPii, isDoNotTrack };
