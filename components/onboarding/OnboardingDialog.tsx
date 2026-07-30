"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, FolderOpen, Share2, Cloud } from "lucide-react";
import { markOnboarded } from "@/lib/actions/settings";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

interface Props {
  open: boolean;
  onComplete: () => void;
}

const STEPS = ["step1", "step2", "step3", "step4"] as const;
const STEP_ICONS = [MapPin, FolderOpen, Share2, Cloud] as const;
const STEP_TITLE_KEYS = ["welcome", "welcome", "welcome", "step4Title"] as const;

export function OnboardingDialog({ open, onComplete }: Props) {
  const t = useTranslations("onboarding");
  const [step, setStep] = useState(0);
  const reduce = useReducedMotion();

  async function finish() {
    await markOnboarded();
    onComplete();
  }

  const isLastStep = step === STEPS.length - 1;
  const Icon = STEP_ICONS[step];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm rounded-3xl overflow-hidden border-border/40 p-0 gap-0 shadow-float">
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
                  style={step === 3 ? { color: "#1a73e8" } : undefined}
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

          <div className="flex gap-1.5 justify-center pb-1">
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
            <Button variant="ghost" onClick={finish} className="rounded-xl">
              {t("skip")}
            </Button>
            {!isLastStep ? (
              <Button className="rounded-xl" onClick={() => setStep((s) => s + 1)}>
                {t("getStarted")}
              </Button>
            ) : (
              <Button className="rounded-xl fab-nature border-0" onClick={finish}>
                {t("getStarted")}
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
