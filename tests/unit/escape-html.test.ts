import { describe, expect, it } from "vitest";
import { escapeHtml } from "@/lib/utils";

describe("escapeHtml", () => {
  it("neutralizes script/img XSS payloads", () => {
    expect(escapeHtml(`<img src=x onerror=alert(1)>`)).toBe(
      "&lt;img src=x onerror=alert(1)&gt;"
    );
    expect(escapeHtml(`Tom & Jerry "quotes"`)).toBe(
      "Tom &amp; Jerry &quot;quotes&quot;"
    );
  });
});
