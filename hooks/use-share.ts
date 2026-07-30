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

function buildSocialLinks(url: string, title: string): SocialShareLinks {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const body = encodeURIComponent(`${title}\n${url}`);
  return {
    whatsapp: `https://wa.me/?text=${body}`,
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
            text: payload.text,
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
    (url: string, title: string) => buildSocialLinks(url, title),
    []
  );

  return useMemo(
    () => ({ share, canNativeShare, socialLinks, busy, buildSocialLinks }),
    [share, canNativeShare, socialLinks, busy]
  );
}

export { buildSocialLinks };
