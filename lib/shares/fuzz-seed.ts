import { createHmac } from "crypto";

/**
 * Seed derivation for SECRET coordinate fuzzing.
 *
 * The fuzz offset must not be recomputable by the share recipient. Seeding it
 * with public inputs (the token from the URL, the location id from the DTO)
 * lets anyone holding the link re-derive the exact offset vector and subtract
 * it back out, which recovers the true coordinates of a SECRET spot. The seed
 * therefore has to be keyed with a server-side secret.
 *
 * Rotating AUTH_SECRET moves every fuzzed pin. That is acceptable: sessions are
 * JWT (`lib/auth/config.ts`), so rotation already signs every user out, and a
 * pin drifting inside its own fuzz radius is strictly less disruptive.
 */
export type FuzzSeedDeriver = (token: string, locationId: string) => string;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET required for share coordinate fuzzing");
  }
  return s;
}

/** Version tag is a deliberate lever: bump it to re-fuzz every share at once. */
const SEED_VERSION = "v1";

export const deriveShareFuzzSeed: FuzzSeedDeriver = (token, locationId) =>
  createHmac("sha256", secret())
    .update(`hs-share-fuzz:${SEED_VERSION}:${token}:${locationId}`)
    .digest("base64url");
