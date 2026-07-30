import type { AnalyticsProps } from "./types";

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g;
const PII_KEYS = /^(email|e-?mail|phone|tel|mobile|password|token|secret|ssn|ip)$/i;

/** Strip emails/phones from string values; drop known PII keys. */
export function scrubPii(props?: AnalyticsProps): AnalyticsProps | undefined {
  if (!props) return undefined;
  const out: AnalyticsProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (PII_KEYS.test(key)) continue;
    if (typeof value === "string") {
      out[key] = value.replace(EMAIL_RE, "[redacted]").replace(PHONE_RE, "[redacted]");
    } else if (value !== undefined && value !== null) {
      out[key] = value;
    }
  }
  return out;
}

export function isDoNotTrack(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { msDoNotTrack?: string };
  const flag = nav.doNotTrack ?? nav.msDoNotTrack ?? (window as Window & { doNotTrack?: string }).doNotTrack;
  return flag === "1" || flag === "yes";
}
