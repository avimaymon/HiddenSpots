import { randomBytes } from "crypto";

/**
 * Public share tokens.
 *
 * These are the only gate on a shared spot, including SECRET ones, so they have
 * to be unguessable. `cuid()` — the previous default — is timestamp + counter +
 * host fingerprint + a Math.random()-derived block, which makes tokens issued
 * near each other partially predictable.
 *
 * 32 random bytes is 43 base64url characters, comfortably inside the 128-char
 * ceiling that the share lookups guard on.
 */
export function newShareToken(): string {
  return randomBytes(32).toString("base64url");
}
