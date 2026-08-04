"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary for crashes in the root layout, where the locale
 * provider and every shared component are unavailable — so this file cannot
 * use next-intl and renders its own <html>/<body>.
 *
 * Without it such a crash rendered Next's default page and reported nothing.
 * Bilingual copy, Hebrew first, matching ClientErrorBoundary's approach.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `[global-error] ${error.message}`,
        stack: error.stack,
        digest: error.digest,
        href: typeof window !== "undefined" ? window.location.href : undefined,
      }),
    }).catch(() => undefined);
  }, [error]);

  return (
    <html lang="he" dir="rtl">
      <body
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0f172a",
          color: "#f8fafc",
        }}
      >
        <h1 style={{ fontSize: "1.125rem", fontWeight: 600 }}>
          משהו השתבש · Something went wrong
        </h1>
        <p style={{ fontSize: "0.875rem", opacity: 0.7, maxWidth: "28rem" }}>
          נסו לרענן את הדף. אם הבעיה חוזרת, נסו שוב מאוחר יותר. · Try reloading. If
          it keeps happening, try again later.
        </p>
        {error.digest && (
          <p style={{ fontSize: "0.75rem", fontFamily: "monospace", opacity: 0.5 }}>
            {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            minHeight: "44px",
            minWidth: "44px",
            padding: "0.625rem 1.25rem",
            borderRadius: "0.75rem",
            border: "none",
            background: "#166534",
            color: "#f8fafc",
            fontSize: "0.9375rem",
            cursor: "pointer",
          }}
        >
          נסו שוב · Try again
        </button>
      </body>
    </html>
  );
}
