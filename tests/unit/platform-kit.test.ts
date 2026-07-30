import { describe, expect, it } from "vitest";
import { scrubPii } from "@/lib/analytics/scrub";
import { buildSocialLinks } from "@/hooks/use-share";
import { buildPageAlternates, absoluteUrl } from "@/lib/seo/site";

describe("scrubPii", () => {
  it("redacts emails and phones in values and drops PII keys", () => {
    const out = scrubPii({
      email: "user@example.com",
      label: "Contact me@hide.me or +972501234567",
      count: 3,
      token: "secret-token",
    });
    expect(out?.email).toBeUndefined();
    expect(out?.token).toBeUndefined();
    expect(out?.count).toBe(3);
    expect(String(out?.label)).toContain("[redacted]");
  });
});

describe("buildSocialLinks", () => {
  it("builds WhatsApp and Telegram share URLs", () => {
    const links = buildSocialLinks("https://hiddenspots.app/he/share/abc", "Cool spot");
    expect(links.whatsapp).toContain("wa.me");
    expect(links.whatsapp).toContain(encodeURIComponent("Cool spot"));
    expect(links.telegram).toContain("t.me/share");
    expect(links.x).toContain("twitter.com/intent/tweet");
  });
});

describe("seo helpers", () => {
  it("builds locale alternates with x-default", () => {
    const alts = buildPageAlternates("he", "/privacy");
    expect(alts.canonical).toBe(absoluteUrl("/he/privacy"));
    expect(alts.languages.he).toBe(absoluteUrl("/he/privacy"));
    expect(alts.languages.en).toBe(absoluteUrl("/en/privacy"));
    expect(alts.languages["x-default"]).toBe(absoluteUrl("/he/privacy"));
  });
});
