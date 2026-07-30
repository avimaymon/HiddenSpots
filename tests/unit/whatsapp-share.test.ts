import { describe, it, expect } from "vitest";
import { buildWhatsAppText, buildSocialLinks } from "@/hooks/use-share";

describe("WhatsApp share copy", () => {
  it("builds Hebrew body with title and url", () => {
    const text = buildWhatsAppText("https://example.com/he/share/abc", "מפל נסתר", "he");
    expect(text).toContain("מפל נסתר");
    expect(text).toContain("https://example.com/he/share/abc");
    expect(text).toContain("HiddenSpots");
  });

  it("whatsapp link encodes the body", () => {
    const links = buildSocialLinks("https://x.test/s", "Spot", { locale: "he" });
    expect(links.whatsapp).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(links.whatsapp)).toContain("Spot");
    expect(decodeURIComponent(links.whatsapp)).toContain("https://x.test/s");
  });
});
