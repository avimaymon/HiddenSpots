import { describe, it, expect } from "vitest";
import { formatLocalizedDate } from "@/lib/utils";

describe("formatLocalizedDate", () => {
  it("uses Hebrew month names for he locale", () => {
    const s = formatLocalizedDate(new Date("2026-07-15T12:00:00Z"), "MMM", "he");
    expect(s.length).toBeGreaterThan(0);
    expect(s).not.toMatch(/Jul/i);
  });

  it("keeps English months for en", () => {
    const s = formatLocalizedDate(new Date("2026-07-15T12:00:00Z"), "MMM", "en");
    expect(s).toMatch(/Jul/i);
  });
});
