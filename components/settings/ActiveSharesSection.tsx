"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { listMyShares, revokeShare, rotateShareToken } from "@/lib/actions/shares";
import { Button } from "@/components/ui/button";
import { Loader2, Link2, Trash2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type ShareRow = Awaited<ReturnType<typeof listMyShares>>[number];

export function ActiveSharesSection() {
  const t = useTranslations("sharing");
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await listMyShares();
      if (!cancelled) {
        setShares(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRevoke(id: string) {
    if (!confirm(t("revokeConfirm"))) return;
    setBusy(id);
    try {
      await revokeShare(id);
      toast({ title: t("revoked"), variant: "success" });
      setShares(await listMyShares());
    } catch (e) {
      toast({ title: String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function handleRotate(id: string) {
    if (!confirm(t("rotateConfirm"))) return;
    setBusy(id);
    try {
      await rotateShareToken(id);
      toast({ title: t("rotated"), variant: "success" });
      setShares(await listMyShares());
    } catch (e) {
      toast({ title: String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border/50 p-4">
      <div>
        <h2 className="font-semibold flex items-center gap-2">
          <Link2 className="h-4 w-4" /> {t("activeShares")}
        </h2>
      </div>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : shares.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noActiveShares")}</p>
      ) : (
        <ul className="space-y-2">
          {shares.map((s) => {
            const label =
              s.location?.title ?? s.collection?.name ?? s.trip?.name ?? s.publicToken;
            return (
              <li
                key={s.id}
                className="flex items-center gap-2 rounded-xl border border-border/40 px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{label}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("viewCount", { count: s.viewCount })}
                    {" · "}
                    {s.permission === "COMMENT"
                      ? t("permComment")
                      : s.permission === "EDIT" || s.permission === "MANAGE"
                        ? t("permEdit")
                        : t("permView")}
                    {s.expiresAt ? ` · ${new Date(s.expiresAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl"
                  disabled={busy === s.id}
                  onClick={() => handleRotate(s.id)}
                  title={t("rotateHint")}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> {t("rotateShare")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl text-destructive"
                  disabled={busy === s.id}
                  onClick={() => handleRevoke(s.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> {t("revokeShare")}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
