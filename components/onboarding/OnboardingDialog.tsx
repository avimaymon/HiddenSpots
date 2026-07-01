"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { markOnboarded } from "@/lib/actions/settings";

interface Props {
  open: boolean;
  onComplete: () => void;
}

const STEPS = ["step1", "step2", "step3"] as const;

export function OnboardingDialog({ open, onComplete }: Props) {
  const t = useTranslations("onboarding");
  const [step, setStep] = useState(0);

  async function finish() {
    await markOnboarded();
    onComplete();
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t("welcome")}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm py-4">{t(STEPS[step])}</p>
        <div className="flex gap-1 justify-center">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full ${i === step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={finish}>{t("skip")}</Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>{t("getStarted")}</Button>
          ) : (
            <Button onClick={finish}>{t("getStarted")}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
