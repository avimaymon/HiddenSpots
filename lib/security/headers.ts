/**
 * Security headers, shared by next.config.ts and locked by a unit test.
 *
 * Next serialises `headers()` into the build manifest, so these are decided at
 * build time — a runtime env var cannot change them. That is why the test
 * asserts on this function rather than on a running server.
 */
export type SecurityHeader = { key: string; value: string };

/**
 * `upgrade-insecure-requests` and HSTS both rewrite/pin http:// to https://.
 * Over a plain-http server — `next start` locally, or the e2e job, both of
 * which run with NODE_ENV=production — every asset request is upgraded to a
 * port with no TLS listener and fails. Chromium special-cases localhost;
 * WebKit does not, so the app rendered entirely unstyled under Safari/iOS,
 * which is the platform this field PWA mainly targets and the reason its
 * mobile Safari path was never testable.
 *
 * Polarity is deliberate: on by default, and a plain-http harness has to ask
 * for them to be dropped. Never disable these for a real deployment.
 */
export function buildContentSecurityPolicy(httpsHeaders = true): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://plausible.io https://*.mapbox.com https://maps.googleapis.com https://*.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.mapbox.com",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https: wss: blob:",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "frame-src 'self' https://*.google.com https://*.googleapis.com",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    ...(httpsHeaders ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function buildSecurityHeaders(httpsHeaders = true): SecurityHeader[] {
  return [
    { key: "X-DNS-Prefetch-Control", value: "on" },
    ...(httpsHeaders
      ? [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ]
      : []),
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(httpsHeaders) },
  ];
}

/** Only a plain-http test harness may set this. */
export const httpsHeadersEnabled = process.env.DISABLE_HTTPS_HEADERS !== "1";
