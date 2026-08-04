import { z } from "zod";

/**
 * Validation for a Web Push subscription before it is stored.
 *
 * The endpoint is a URL this server will later issue POST requests to. Storing
 * whatever the client sends therefore hands an authenticated user a
 * server-side request primitive — the classic SSRF shape, and one that would
 * reach internal addresses a browser never could. It is inert only for as long
 * as delivery is unimplemented, which is exactly why the allowlist belongs
 * here rather than alongside the sender.
 *
 * Pure so the rules are testable without a request.
 */

/**
 * Hosts that operate the browser push services. Anything else is refused:
 * a real subscription's endpoint always comes from the user agent's own push
 * service, never from a host the page chose.
 */
export const ALLOWED_PUSH_HOSTS = [
  // Chrome / Edge / Chromium
  "fcm.googleapis.com",
  "android.googleapis.com",
  // Firefox
  "updates.push.services.mozilla.com",
  // Safari / Apple
  "web.push.apple.com",
  // Edge (legacy WNS)
  "wns2-.*\\.notify\\.windows\\.com",
  "notify.windows.com",
] as const;

function isAllowedPushEndpoint(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  // TLS only: the endpoint is a credential-bearing URL.
  if (url.protocol !== "https:") return false;

  return ALLOWED_PUSH_HOSTS.some((pattern) =>
    pattern.includes("*") || pattern.includes("\\.")
      ? new RegExp(`^${pattern}$`).test(url.hostname)
      : url.hostname === pattern || url.hostname.endsWith(`.${pattern}`)
  );
}

export const pushSubscriptionSchema = z.object({
  endpoint: z
    .string()
    .url()
    .max(2048)
    .refine(isAllowedPushEndpoint, "Unrecognised push service endpoint"),
  expirationTime: z.number().nullable().optional(),
  keys: z
    .object({
      p256dh: z.string().min(1).max(255),
      auth: z.string().min(1).max(255),
    })
    // Absent only for a subscription that cannot receive encrypted payloads.
    .optional(),
});

export type ValidatedPushSubscription = z.infer<typeof pushSubscriptionSchema>;
