import { afterEach, describe, expect, it } from "vitest";
import { signDriveOAuthState, verifyDriveOAuthState } from "@/lib/auth/oauth-state";

const PREV = process.env.AUTH_SECRET;

afterEach(() => {
  if (PREV === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = PREV;
});

describe("signDriveOAuthState / verifyDriveOAuthState", () => {
  it("round-trips a valid state", () => {
    process.env.AUTH_SECRET = "ci-test-secret-at-least-32-characters";
    const state = signDriveOAuthState("user-abc");
    const payload = verifyDriveOAuthState(state);
    expect(payload?.userId).toBe("user-abc");
    expect(payload?.nonce).toBeTruthy();
    expect(payload!.exp).toBeGreaterThan(Date.now());
  });

  it("rejects tampered payload", () => {
    process.env.AUTH_SECRET = "ci-test-secret-at-least-32-characters";
    const state = signDriveOAuthState("user-abc");
    const [body, sig] = state.split(".");
    const tamperedBody = Buffer.from(
      JSON.stringify({ userId: "victim", nonce: "x", exp: Date.now() + 60_000 })
    ).toString("base64url");
    expect(verifyDriveOAuthState(`${tamperedBody}.${sig}`)).toBeNull();
    expect(verifyDriveOAuthState(`${body}.deadbeef`)).toBeNull();
  });

  it("rejects bare userId (legacy attack vector)", () => {
    process.env.AUTH_SECRET = "ci-test-secret-at-least-32-characters";
    expect(verifyDriveOAuthState("clxxxxxxxxvictimid")).toBeNull();
  });

  it("rejects expired state", () => {
    process.env.AUTH_SECRET = "ci-test-secret-at-least-32-characters";
    const now = Date.now();
    const state = signDriveOAuthState("user-abc", 1_000, now - 5_000);
    expect(verifyDriveOAuthState(state, now)).toBeNull();
  });

  it("throws when AUTH_SECRET missing on sign", () => {
    delete process.env.AUTH_SECRET;
    expect(() => signDriveOAuthState("user-abc")).toThrow(/AUTH_SECRET/);
  });
});
