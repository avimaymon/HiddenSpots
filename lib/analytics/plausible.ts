import type { AnalyticsProvider, AnalyticsProps } from "./types";

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, string | number | boolean>; u?: string }) => void;
  }
}

export function createPlausibleProvider(_domain: string): AnalyticsProvider {
  void _domain;
  return {
    name: "plausible",
    pageview(path: string) {
      window.plausible?.("pageview", { u: path });
    },
    event(name: string, props?: AnalyticsProps) {
      const clean: Record<string, string | number | boolean> = {};
      if (props) {
        for (const [k, v] of Object.entries(props)) {
          if (v !== undefined && v !== null) clean[k] = v;
        }
      }
      window.plausible?.(name, Object.keys(clean).length ? { props: clean } : undefined);
    },
  };
}

export function getPlausibleDomain(): string | undefined {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim();
  return domain || undefined;
}
