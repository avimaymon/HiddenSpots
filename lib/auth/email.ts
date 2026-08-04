import { z } from "zod";

/**
 * Email addresses are matched case-insensitively.
 *
 * The rate-limit keys already lowercased, but the `findUnique` lookups next to
 * them did not, and registration stored whatever case was typed. That split
 * produced two failures: `Alice@x.com` could register a second account
 * alongside `alice@x.com`, and anyone who signed up with a capital could not
 * sign in by typing their address in lower case — the lookup simply missed.
 *
 * Normalising in the schema rather than at each call site is deliberate: this
 * has to hold for sign-in, registration and password reset alike, and a
 * `.transform` cannot be forgotten the way a stray `.toLowerCase()` was.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Validates an address and yields it normalised. */
export const emailSchema = z.string().email().transform(normalizeEmail);
