"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { MessageSquarePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { submitFeedback } from "@/lib/actions/feedback";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";

export function FeedbackDialog() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 3) return;
    startTransition(async () => {
      try {
        await submitFeedback({ message, page: pathname, locale });
        track("feedback", { locale });
        toast({ title: t("feedbackThanks"), variant: "success" });
        setMessage("");
        setOpen(false);
      } catch {
        toast({ title: t("feedbackFailed"), variant: "destructive" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="fixed z-40 end-3 bottom-[calc(var(--nav-height)+var(--safe-bottom)+4.5rem)] md:bottom-6 md:end-6 h-11 w-11 rounded-full border border-border/60 bg-card/95 shadow-md backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          aria-label={t("feedback")}
        >
          <MessageSquarePlus className="h-5 w-5" />
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl max-w-md" description={t("feedbackHint")}>
        <DialogHeader>
          <DialogTitle>{t("feedback")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t("feedbackHint")}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("feedbackPlaceholder")}
            rows={4}
            maxLength={2000}
            className="resize-none rounded-xl"
          />
          <Button
            type="submit"
            className="w-full rounded-xl"
            disabled={isPending || message.trim().length < 3}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("sending")}
              </>
            ) : (
              t("sendFeedback")
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
