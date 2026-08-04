import { describe, it, expect } from "vitest";
import { buildSecurityHeaders, buildContentSecurityPolicy } from "@/lib/security/headers";

const byKey = (headers: ReturnType<typeof buildSecurityHeaders>, key: string) =>
  headers.find((h) => h.key === key)?.value;

describe("production security headers", () => {
  const headers = buildSecurityHeaders(true);

  it("sends HSTS with a long max-age, subdomains and preload", () => {
    expect(byKey(headers, "Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload"
    );
  });

  it("upgrades insecure requests", () => {
    expect(buildContentSecurityPolicy(true)).toContain("upgrade-insecure-requests");
  });

  it("keeps the CSP enforcing, not report-only, and locks the dangerous directives", () => {
    const csp = byKey(headers, "Content-Security-Policy") ?? "";
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("default-src 'self'");
  });

  it("keeps the rest of the baseline set", () => {
    expect(byKey(headers, "X-Content-Type-Options")).toBe("nosniff");
    expect(byKey(headers, "X-Frame-Options")).toBe("SAMEORIGIN");
    expect(byKey(headers, "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(byKey(headers, "Permissions-Policy")).toContain("microphone=()");
  });
});

describe("plain-http test harness", () => {
  const headers = buildSecurityHeaders(false);

  it("withholds only the two directives that break http, nothing else", () => {
    expect(byKey(headers, "Strict-Transport-Security")).toBeUndefined();
    expect(byKey(headers, "Content-Security-Policy")).not.toContain(
      "upgrade-insecure-requests"
    );

    // Everything else must be identical to production, so the harness is not
    // quietly testing a weaker app than the one that ships.
    const prod = buildSecurityHeaders(true);
    for (const key of [
      "X-DNS-Prefetch-Control",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]) {
      expect(byKey(headers, key)).toBe(byKey(prod, key));
    }
  });

  it("differs from production by exactly one directive in the CSP", () => {
    const prod = buildContentSecurityPolicy(true).split("; ");
    const test = buildContentSecurityPolicy(false).split("; ");
    expect(prod.filter((d) => !test.includes(d))).toEqual(["upgrade-insecure-requests"]);
    expect(test.filter((d) => !prod.includes(d))).toEqual([]);
  });
});
