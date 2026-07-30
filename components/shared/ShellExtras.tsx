"use client";

import { useState, useEffect } from "react";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { PwaInstallPrompt } from "@/components/shared/PwaInstallPrompt";
import { WhatsNewModal } from "@/components/shared/WhatsNewModal";
import { FeedbackDialog } from "@/components/shared/FeedbackDialog";
import { useVisualViewport } from "@/hooks/useVisualViewport";
import { trackPageview } from "@/lib/analytics";
import { usePathname } from "next/navigation";

interface Props {
  onboarded: boolean;
}

function AnalyticsPageview() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) trackPageview(pathname);
  }, [pathname]);
  return null;
}

export function ShellExtras({ onboarded }: Props) {
  const [dismissed, setDismissed] = useState(false);
  useVisualViewport();
  // OfflineBanner owns useSyncQueue — avoid double flush loops

  return (
    <>
      <AnalyticsPageview />
      <OfflineBanner />
      <PwaInstallPrompt />
      <WhatsNewModal />
      <FeedbackDialog />
      <OnboardingDialog
        open={!onboarded && !dismissed}
        onComplete={() => setDismissed(true)}
      />
    </>
  );
}
