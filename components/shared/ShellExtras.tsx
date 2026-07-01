"use client";

import { useEffect, useState } from "react";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { useVisualViewport } from "@/hooks/useVisualViewport";

interface Props {
  onboarded: boolean;
}

export function ShellExtras({ onboarded }: Props) {
  const [showOnboarding, setShowOnboarding] = useState(!onboarded);
  useVisualViewport();

  useEffect(() => {
    setShowOnboarding(!onboarded);
  }, [onboarded]);

  return (
    <>
      <OfflineBanner />
      <OnboardingDialog open={showOnboarding} onComplete={() => setShowOnboarding(false)} />
    </>
  );
}
