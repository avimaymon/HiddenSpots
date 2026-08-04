import { describe, it, expect } from "vitest";
import { normalizeEmail, emailSchema } from "@/lib/auth/email";

describe("email normalisation", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Alice@Example.COM  ")).toBe("alice@example.com");
  });

  it("is idempotent", () => {
    const once = normalizeEmail("Bob@X.io");
    expect(normalizeEmail(once)).toBe(once);
  });

  it("makes case variants collapse to one identity", () => {
    // The bug: these were three distinct accounts, and only one of them could
    // ever sign in with the address as typed.
    const variants = ["alice@x.com", "Alice@x.com", "ALICE@X.COM"];
    expect(new Set(variants.map(normalizeEmail)).size).toBe(1);
  });

  it("normalises through the schema, so call sites cannot skip it", () => {
    expect(emailSchema.parse("Dana@Example.com")).toBe("dana@example.com");
  });

  it("still rejects addresses that are not valid", () => {
    expect(() => emailSchema.parse("not-an-email")).toThrow();
    expect(() => emailSchema.parse("")).toThrow();
  });

  it("does not touch the local part beyond case", () => {
    // Dots and plus-addressing are meaningful to some providers; collapsing
    // them would merge addresses that are genuinely different mailboxes.
    expect(normalizeEmail("First.Last+tag@Example.com")).toBe(
      "first.last+tag@example.com"
    );
  });
});
