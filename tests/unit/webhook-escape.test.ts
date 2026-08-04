import { describe, it, expect } from "vitest";
import { escapeWebhookText } from "@/lib/observability/webhook";

describe("escapeWebhookText", () => {
  it("defuses @everyone and @here", () => {
    const out = escapeWebhookText("hi @everyone and @here");
    expect(out).not.toMatch(/(^|[^​])@everyone/);
    expect(out).not.toMatch(/(^|[^​])@here/);
    // The words stay readable in the channel.
    expect(out).toContain("everyone");
    expect(out).toContain("here");
  });

  it("defuses user and role mentions", () => {
    expect(escapeWebhookText("ping <@123456789>")).not.toContain("<@123456789>");
    expect(escapeWebhookText("ping <@&987654321>")).not.toContain("<@&987654321>");
  });

  it("escapes markdown so reports cannot forge formatting", () => {
    const out = escapeWebhookText("**bold** `code` _em_ ~strike~ >quote");
    for (const c of ["*", "`", "_", "~", ">"]) {
      expect(out).not.toMatch(new RegExp(`(^|[^\\\\])\\${c}`));
    }
  });

  it("truncates to the requested length", () => {
    expect(escapeWebhookText("a".repeat(900)).length).toBeLessThanOrEqual(500);
    expect(escapeWebhookText("a".repeat(900), 100).length).toBeLessThanOrEqual(100);
  });

  it("leaves ordinary text alone", () => {
    expect(escapeWebhookText("Map crashed on /he/app in Safari")).toBe(
      "Map crashed on /he/app in Safari"
    );
  });
});
