"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitSpotReport } from "@/lib/actions/reports";
import { toast } from "@/hooks/use-toast";

const REASONS = [
  "INACCURATE",
  "CLOSED",
  "DANGEROUS",
  "INAPPROPRIATE",
  "DUPLICATE",
] as const;

interface Props {
  locationId: string;
  shareToken?: string;
}

export function SpotReportButton({ locationId, shareToken }: Props) {
  const t = useTranslations("sharing");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!reason) return;
    startTransition(async () => {
      try {
        await submitSpotReport({
          locationId,
          shareToken,
          reason: reason as (typeof REASONS)[number],
          details: details || undefined,
        });
        toast({ title: t("reportSubmitted"), variant: "success" });
        setOpen(false);
        setReason("");
        setDetails("");
      } catch {
        toast({ title: t("reportFailed"), variant: "destructive" });
      }
    });
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setOpen(true)}>
        <Flag className="h-3.5 w-3.5" />
        {t("reportSpot")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("reportTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>{t("reportReason")}</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder={t("reportReasonPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`reportReasons.${r}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("reportDetails")}</Label>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                placeholder={t("reportDetailsPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={!reason || pending} className="rounded-xl">
              {pending ? t("reportSubmitting") : t("reportSubmit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
