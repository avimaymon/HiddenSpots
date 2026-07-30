export type AnalyticsProps = Record<string, string | number | boolean | undefined | null>;

export interface AnalyticsProvider {
  readonly name: string;
  pageview(path: string): void;
  event(name: string, props?: AnalyticsProps): void;
}
