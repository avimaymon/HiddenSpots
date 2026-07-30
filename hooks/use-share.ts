"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { copyToClipboard } from "@/lib/navigation/external-links";
import { track } from "@/lib/analytics";

export interface SharePayload {
  title: string;
  text?: string;
  url: string;
}

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

export interface SocialShareLinks {
  whatsapp: string;
  telegram: string;
  x: string;
  linkedin: string;
  reddit: string;
}

/** Hebrew-first WhatsApp body — title + short CTA + deep link. */
export function buildWhatsAppText(url: string, title: string, localeHint = "he"): string {
  if (localeHint.startsWith("he")) {
    return `מצאתי מקום מושלם ב-HiddenSpots: ${title}\n\nלחצו לפתיחה:\n${url}`;
  }
  return `Found a great spot on HiddenSpots: ${title}\n\nOpen here:\n${url}`;
}

function buildSocialLinks(
  url: string,
  title: string,
  opts?: { locale?: string; text?: string }
): SocialShareLinks {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const waBody = encodeURIComponent(
    opts?.text?.trim() || buildWhatsAppText(url, title, opts?.locale ?? "he")
  );
  return {
    whatsapp: `https://wa.me/?text=${waBody}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    reddit: `https://www.reddit.com/submit?url=${u}&title=${t}`,
  };
}

function subscribeNoop() {
  return () => {};
}

function getNativeShareSnapshot(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/**
 * Web Share API with clipboard + named social fallbacks.
 * One hook — zero per-page boilerplate.
 */
export function useShare() {
  const canNativeShare = useSyncExternalStore(
    subscribeNoop,
    getNativeShareSnapshot,
    () => false
  );
  const [busy, setBusy] = useState(false);

  const share = useCallback(async (payload: SharePayload): Promise<ShareResult> => {
    setBusy(true);
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: payload.title,
            text: payload.text ?? buildWhatsAppText(payload.url, payload.title),
            url: payload.url,
          });
          track("share", { method: "native" });
          return "shared";
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return "cancelled";
          // fall through to clipboard
        }
      }
      const ok = await copyToClipboard(payload.url);
      if (ok) {
        track("share", { method: "clipboard" });
        return "copied";
      }
      return "failed";
    } finally {
      setBusy(false);
    }
  }, []);

  const socialLinks = useCallback(
    (url: string, title: string, opts?: { locale?: string; text?: string }) =>
      buildSocialLinks(url, title, opts),
    []
  );

  return useMemo(
    () => ({ share, canNativeShare, socialLinks, busy, buildSocialLinks, buildWhatsAppText }),
    [share, canNativeShare, socialLinks, busy]
  );
}

export { buildSocialLinks };
