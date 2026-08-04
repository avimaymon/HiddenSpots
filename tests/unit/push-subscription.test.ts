import { describe, it, expect } from "vitest";
import { pushSubscriptionSchema } from "@/lib/push/subscription";

const sub = (endpoint: string) => ({
  endpoint,
  keys: { p256dh: "key", auth: "auth" },
});

const ok = (endpoint: string) => pushSubscriptionSchema.safeParse(sub(endpoint)).success;

describe("push subscription validation", () => {
  it("accepts the real browser push services", () => {
    expect(ok("https://fcm.googleapis.com/fcm/send/abc123")).toBe(true);
    expect(ok("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
    expect(ok("https://web.push.apple.com/abc123")).toBe(true);
  });

  it("refuses endpoints pointing anywhere else", () => {
    // The stored endpoint is a URL the server will POST to once delivery
    // ships, so accepting an arbitrary host hands any logged-in user a
    // server-side request primitive that reaches what a browser cannot.
    expect(ok("https://attacker.example/collect")).toBe(false);
    expect(ok("http://169.254.169.254/latest/meta-data/")).toBe(false);
    expect(ok("https://localhost:3000/internal")).toBe(false);
    expect(ok("https://10.0.0.1/admin")).toBe(false);
  });

  it("refuses a lookalike host that merely contains an allowed name", () => {
    expect(ok("https://fcm.googleapis.com.evil.test/x")).toBe(false);
    expect(ok("https://notfcm.googleapis.com/x")).toBe(false);
  });

  it("requires https", () => {
    expect(ok("http://fcm.googleapis.com/fcm/send/abc")).toBe(false);
  });

  it("rejects non-URL and oversized endpoints", () => {
    expect(ok("not-a-url")).toBe(false);
    expect(ok(`https://fcm.googleapis.com/${"x".repeat(2100)}`)).toBe(false);
  });

  it("allows a subscription without keys but rejects a malformed one", () => {
    expect(
      pushSubscriptionSchema.safeParse({ endpoint: "https://web.push.apple.com/a" }).success
    ).toBe(true);
    expect(
      pushSubscriptionSchema.safeParse({
        endpoint: "https://web.push.apple.com/a",
        keys: { p256dh: "" },
      }).success
    ).toBe(false);
  });

  it("rejects a body with no endpoint at all", () => {
    expect(pushSubscriptionSchema.safeParse({}).success).toBe(false);
    expect(pushSubscriptionSchema.safeParse(null).success).toBe(false);
  });
});
