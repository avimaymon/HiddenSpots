"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Share2, Copy, Check, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShare } from "@/hooks/use-share";
import { copyToClipboard } from "@/lib/navigation/external-links";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";

interface Props {
  title: string;
  url?: string;
  text?: string;
}

export function ShareActions({ title, url, text }: Props) {
  const t = useTranslations("sharing");
  const { share, canNativeShare, socialLinks, busy } = useShare();
  const [copied, setCopied] = useState(false);

  const href =
    url ?? (typeof window !== "undefined" ? window.location.href : "");

  const locale =
    typeof window !== "undefined"
      ? window.location.pathname.split("/")[1] || "he"
      : "he";

  const links = useMemo(
    () => (href ? socialLinks(href, title, { locale, text }) : null),
    [href, title, socialLinks, locale, text]
  );

  async function handleNativeShare() {
    if (!href) return;
    const result = await share({
      title,
      text: text ?? (locale.startsWith("he")
        ? `מצאתי מקום מושלם ב-HiddenSpots: ${title}`
        : `Found a great spot on HiddenSpots: ${title}`),
      url: href,
    });
    if (result === "failed") {
      toast({ title: t("linkCopyFailed"), variant: "destructive" });
    } else if (result === "copied") {
      setCopied(true);
      toast({ title: t("linkCopied"), variant: "success" });
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleCopy() {
    if (!href) return;
    const ok = await copyToClipboard(href);
    if (ok) {
      track("share", { method: "clipboard" });
      setCopied(true);
      toast({ title: t("linkCopied"), variant: "success" });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast({ title: t("linkCopyFailed"), variant: "destructive" });
    }
  }

  return (
    <div className="space-y-3" aria-label={t("shareVia")}>
      <div className="flex flex-wrap justify-center gap-2">
        {canNativeShare && (
          <Button
            className="rounded-xl"
            onClick={handleNativeShare}
            disabled={busy || !href}
          >
            <Share2 className="h-4 w-4" aria-hidden />
            {t("shareNative")}
          </Button>
        )}
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={handleCopy}
          disabled={busy || !href}
          aria-label={t("copyLink")}
        >
          {copied ? (
            <Check className="h-4 w-4 text-primary" aria-hidden />
          ) : (
            <Copy className="h-4 w-4" aria-hidden />
          )}
          {t("copyLink")}
        </Button>
      </div>

      {links && (
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="secondary" size="sm" className="rounded-xl" asChild>
            <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
              {t("shareWhatsApp")}
            </a>
          </Button>
          <Button variant="secondary" size="sm" className="rounded-xl" asChild>
            <a href={links.telegram} target="_blank" rel="noopener noreferrer">
              <Send className="h-3.5 w-3.5" aria-hidden />
              {t("shareTelegram")}
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
