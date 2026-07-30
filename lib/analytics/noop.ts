import type { AnalyticsProvider } from "./types";

export const noopProvider: AnalyticsProvider = {
  name: "noop",
  pageview() {},
  event() {},
};
