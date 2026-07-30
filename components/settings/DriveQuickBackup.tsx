"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { getDriveStatus, backupToDrive, type DriveStatus } from "@/lib/actions/drive";
import { cn } from "@/lib/utils";

const DRIVE_BLUE = "#1a73e8";

/**
 * Compact icon button shown in the Locations header toolbar.
 * Connected + idle → cloud icon (click to backup)
 * Not connected → faint cloud-off icon (click goes to settings)
 * Backing up → spinner
 */
export function DriveQuickBackup() {
  const t = useTranslations("settings");
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [backing, setBacking] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const s = await getDriveStatus();
      setStatus(s);
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  async function handleClick() {
    if (!status?.connected) {
      window.location.href = "/api/drive/connect";
      return;
    }
    setBacking(true);
    try {
      const result = await backupToDrive();
      toast({ title: t("driveSuccess"), description: `${result.locationCount} spots`, variant: "success" });
      await refresh();
    } catch (e) {
      toast({ title: t("driveFailed"), description: String(e), variant: "destructive" });
    } finally {
      setBacking(false);
    }
  }

  const label = status?.connected ? t("driveBackupNow") : t("driveConnect");

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={backing}
      aria-label={label}
      title={label}
      className={cn(
        "rounded-xl h-9 w-9",
        !status?.connected && "opacity-40"
      )}
    >
      {backing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : status?.connected ? (
        <Cloud className="h-4 w-4" style={{ color: DRIVE_BLUE }} />
      ) : (
        <CloudOff className="h-4 w-4" />
      )}
    </Button>
  );
}
