import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "@/lib/auth/safe-callback-url";

describe("safeCallbackUrl", () => {
  it("allows locale app paths", () => {
    expect(safeCallbackUrl("/he/app")).toBe("/he/app");
    expect(safeCallbackUrl("/en/settings")).toBe("/en/settings");
  });

  it("rejects external and protocol-relative urls", () => {
    expect(safeCallbackUrl("https://evil.com")).toBe("/he/app");
    expect(safeCallbackUrl("//evil.com")).toBe("/he/app");
    expect(safeCallbackUrl("/signin")).toBe("/he/app");
  });
});
