"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, FolderOpen, Share2, Map, Cloud } from "lucide-react";
import { markOnboarded } from "@/lib/actions/settings";
import { track } from "@/lib/analytics";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Link } from "@/i18n/navigation";

interface Props {
  open: boolean;
  onComplete: () => void;
}

const STEPS = ["step1", "step2", "step3", "stepMyMaps", "step4"] as const;
const STEP_ICONS = [MapPin, FolderOpen, Share2, Map, Cloud] as const;
const STEP_TITLE_KEYS = [
  "step1Title",
  "step2Title",
  "step3Title",
  "stepMyMapsTitle",
  "step4Title",
] as const;

export function OnboardingDialog({ open, onComplete }: Props) {
  const t = useTranslations("onboarding");
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const reduce = useReducedMotion();

  async function finish(via: "complete" | "skip" | "cta" = "complete") {
    if (busy) return;
    setBusy(true);
    try {
      track("onboarding_complete", { via, step: STEPS[step] });
      await markOnboarded();
      onComplete();
    } finally {
      setBusy(false);
    }
  }

  const isLastStep = step === STEPS.length - 1;
  const isMyMaps = STEPS[step] === "stepMyMaps";
  const isFirstPin = STEPS[step] === "step1";
  const Icon = STEP_ICONS[step];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-sm rounded-3xl overflow-hidden border-border/40 p-0 gap-0 shadow-float"
        aria-describedby="onboarding-desc"
      >
        <div className="relative h-36 gradient-mesh overflow-hidden">
          <div className="absolute inset-0 sun-flare opacity-70" />
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={reduce ? false : { opacity: 0, scale: 0.85, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.9, y: -8 }}
                transition={{ duration: 0.28 }}
                className="h-20 w-20 rounded-3xl glass-strong flex items-center justify-center shadow-float"
              >
                <Icon
                  className="h-9 w-9 text-primary"
                  style={
                    isLastStep
                      ? { color: "#1a73e8" }
                      : isMyMaps
                        ? { color: "#34a853" }
                        : undefined
                  }
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              {t(STEP_TITLE_KEYS[step])}
            </DialogTitle>
            <DialogDescription id="onboarding-desc" className="sr-only">
              {t("progressAria", { current: step + 1, total: STEPS.length })}
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            <motion.p
              key={`copy-${step}`}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0 }}
              className="text-muted-foreground text-sm text-center leading-relaxed min-h-[3.5rem]"
            >
              {t(STEPS[step])}
            </motion.p>
          </AnimatePresence>

          {isFirstPin && (
            <Button
              asChild
              className="w-full rounded-xl fab-nature border-0"
              disabled={busy}
              onClick={() => void finish("cta")}
            >
              <Link href="/app">{t("addFirstSpotCta")}</Link>
            </Button>
          )}

          {isMyMaps && (
            <Button
              asChild
              variant="secondary"
              className="w-full rounded-xl"
              disabled={busy}
              onClick={() => void finish("cta")}
            >
              <Link href="/import">{t("stepMyMapsCta")}</Link>
            </Button>
          )}

          {isLastStep && (
            <Button asChild variant="outline" className="w-full rounded-xl" disabled={busy}>
              <Link href="/settings" onClick={() => void finish("cta")}>
                {t("openSettingsCta")}
              </Link>
            </Button>
          )}

          <div
            className="flex gap-1.5 justify-center pb-1"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={step + 1}
            aria-label={t("progressAria", { current: step + 1, total: STEPS.length })}
          >
            {STEPS.map((_, i) => (
              <motion.span
                key={i}
                layout
                className="h-1.5 rounded-full bg-primary/25"
                animate={{
                  width: i === step ? 24 : 6,
                  backgroundColor:
                    i === step ? "hsl(var(--primary))" : "hsl(var(--muted))",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => void finish("skip")} className="rounded-xl" disabled={busy}>
              {t("skip")}
            </Button>
            {!isLastStep ? (
              <Button
                className="rounded-xl"
                onClick={() => {
                  track("onboarding_step", { step: STEPS[step], next: STEPS[step + 1] });
                  setStep((s) => s + 1);
                }}
                disabled={busy}
              >
                {t("next")}
              </Button>
            ) : (
              <Button
                className="rounded-xl fab-nature border-0"
                onClick={() => void finish("complete")}
                disabled={busy}
              >
                {t("getStarted")}
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
