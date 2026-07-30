"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Link2, Loader2, Copy, Check, Share as ShareIcon, Calendar, QrCode, MessageCircle, Users,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createShare } from "@/lib/actions/shares";
import { useShare, buildWhatsAppText } from "@/hooks/use-share";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId?: string;
  collectionId?: string;
  tripId?: string;
  title?: string;
  /** Prefer COMMENT for hiking-partner invites (can leave notes). */
  defaultPermission?: "VIEW" | "COMMENT" | "EDIT";
  partnerInvite?: boolean;
}

export function DbShareDialog({
  open,
  onOpenChange,
  locationId,
  collectionId,
  tripId,
  title,
  defaultPermission = "VIEW",
  partnerInvite = false,
}: Props) {
  const t = useTranslations("sharing");
  const tc = useTranslations("common");
  const { share, canNativeShare, socialLinks } = useShare();
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [permission, setPermission] = useState<"VIEW" | "COMMENT" | "EDIT">(
    partnerInvite ? "COMMENT" : defaultPermission
  );
  const [email, setEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  async function handleCreate() {
    setLoading(true);
    try {
      const created = await createShare({
        permission,
        sharedWithEmail: email.trim() || undefined,
        locationId,
        collectionId,
        tripId,
        expiresAt: expiresAt || undefined,
      });
      const locale = window.location.pathname.split("/")[1] || "he";
      const url = `${window.location.origin}/${locale}/share/${created.publicToken}`;
      setShareUrl(url);
      setShareId(created.id);
      track("share", {
        method: partnerInvite ? "invite_partner" : "create_link",
        permission,
      });
      toast({ title: t("linkCreated"), variant: "success" });
    } catch (e) {
      toast({ title: t("createFailed"), description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    const shareTitle = title ? t("shareTitleNamed", { title }) : t("shareTitle");
    const result = await share({
      title: shareTitle,
      text: buildWhatsAppText(shareUrl, title ?? shareTitle),
      url: shareUrl,
    });
    if (result === "copied" || result === "shared") {
      setCopied(true);
      toast({ title: t("linkCopied"), variant: "success" });
      setTimeout(() => setCopied(false), 2000);
    } else if (result === "failed") {
      toast({ title: t("linkCopyFailed"), variant: "destructive" });
    }
  }

  async function handleNativeShare() {
    if (!shareUrl) return;
    const shareTitle = title ? t("shareTitleNamed", { title }) : t("shareTitle");
    await share({
      title: shareTitle,
      text: buildWhatsAppText(shareUrl, title ?? shareTitle),
      url: shareUrl,
    });
  }

  function handleClose(next: boolean) {
    if (!next) {
      setShareUrl(null);
      setShareId(null);
      setEmail("");
      setExpiresAt("");
      setPermission(partnerInvite ? "COMMENT" : defaultPermission);
    }
    onOpenChange(next);
  }

  const locale =
    typeof window !== "undefined"
      ? window.location.pathname.split("/")[1] || "he"
      : "he";
  const wa =
    shareUrl && title
      ? socialLinks(shareUrl, title, { locale }).whatsapp
      : shareUrl
        ? socialLinks(shareUrl, t("shareTitle"), { locale }).whatsapp
        : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {partnerInvite ? (
              <Users className="h-4 w-4 text-primary" />
            ) : (
              <Link2 className="h-4 w-4 text-primary" />
            )}
            {partnerInvite
              ? t("invitePartnerTitle")
              : title
                ? t("shareNamed", { title })
                : t("shareLink")}
          </DialogTitle>
        </DialogHeader>

        {shareUrl ? (
          <div className="space-y-3 animate-scale-in">
            <div className="flex justify-center py-1">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center share-check-pop">
                <Check className="h-7 w-7 text-primary" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {partnerInvite ? t("invitePartnerReady") : t("anyoneWithLink")}
            </p>
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="font-mono text-xs h-10" />
              <Button size="icon" variant="outline" onClick={handleCopy} className="shrink-0 rounded-xl" aria-label={t("copyLink")}>
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            {wa && (
              <Button variant="secondary" className="w-full rounded-xl" asChild>
                <a href={wa} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  {partnerInvite ? t("invitePartnerWhatsApp") : t("shareWhatsApp")}
                </a>
              </Button>
            )}
            {canNativeShare && (
              <Button variant="secondary" className="w-full rounded-xl" onClick={handleNativeShare}>
                <ShareIcon className="h-4 w-4" /> {t("shareNative")}
              </Button>
            )}
            <Button variant="ghost" size="sm" className="w-full rounded-xl gap-1.5" onClick={() => setShowQr((v) => !v)}>
              <QrCode className="h-3.5 w-3.5" /> {showQr ? t("hideQr") : t("showQr")}
            </Button>
            {showQr && (
              <div className="flex justify-center py-2">
                <QRCodeSVG value={shareUrl} size={180} className="rounded-xl" />
              </div>
            )}
            {shareId && (
              <p className="text-xs text-muted-foreground">{t("manageHint")}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {partnerInvite && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("invitePartnerHint")}
              </p>
            )}
            <div className="space-y-2">
              <Label>{t("permission")}</Label>
              <Select value={permission} onValueChange={(v) => setPermission(v as typeof permission)}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEW">{t("permView")}</SelectItem>
                  <SelectItem value="COMMENT">{t("permComment")}</SelectItem>
                  <SelectItem value="EDIT">{t("permEdit")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("inviteEmail")}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {t("expiresAt")}
              </Label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {shareUrl ? tc("close") : tc("cancel")}
          </Button>
          {!shareUrl && (
            <Button onClick={handleCreate} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {partnerInvite ? t("invitePartnerCreate") : t("createLink")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
