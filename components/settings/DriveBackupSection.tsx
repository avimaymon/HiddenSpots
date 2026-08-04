"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useTranslations } from "next-intl";
import { Cloud, CloudOff, RefreshCw, Download, Loader2, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  getDriveStatus,
  backupToDrive,
  restoreFromDrive,
  dryRunRestoreFromDrive,
  disconnectDrive,
  setDriveAutoBackup,
  type DriveStatus,
} from "@/lib/actions/drive";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const DRIVE_BLUE = "#1a73e8";

const DriveLogo = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden>
    <path d="M22.5 14.4L13.5 2.4C13.1 1.8 12.5 1.5 12 1.5s-1.1.3-1.5.9L1.5 14.4c-.4.6-.4 1.3 0 1.9L4.8 21c.4.6 1 .9 1.7.9h11c.6 0 1.3-.3 1.7-.9l3.3-4.7c.4-.6.4-1.3 0-1.9z" fill="#4285F4"/>
    <path d="M12 1.5L1.5 14.4h5.6L12 6.6l4.9 7.8H22.5L12 1.5z" fill="#FBBC05"/>
    <path d="M1.5 14.4l3.3 4.7c.4.6 1 .9 1.7.9H12v-7.2H7.1L1.5 14.4z" fill="#34A853"/>
    <path d="M22.5 14.4l-3.3 4.7c-.4.6-1 .9-1.7.9H12V20l5.6-7.8-1.1 2.2H22.5z" fill="#EA4335"/>
  </svg>
);

/**
 * Inner component — uses useSearchParams so must live inside a Suspense boundary.
 */
function DriveBackupInner() {
  const t = useTranslations("settings");
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  // Inline confirm state instead of window.confirm()
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [testing, setTesting] = useState(false);
  const [dryRun, setDryRun] = useState<{
    wouldImport: number;
    wouldSkip: number;
    totalInBackup: number;
    sampleTitles: string[];
  } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await getDriveStatus();
      setStatus(s);
    } catch {
      setStatus({
        connected: false,
        lastBackupAt: null,
        driveFileId: null,
        driveModifiedAt: null,
        autoBackup: false,
        lastRestoreTestAt: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const driveParam = searchParams.get("drive");
    if (driveParam === "connected") {
      toast({ title: t("driveConnected"), variant: "success" });
      refresh();
    } else if (driveParam === "error") {
      toast({ title: t("driveFailed"), variant: "destructive" });
    }
  }, [refresh, searchParams, t]);

  async function handleBackup() {
    setBacking(true);
    try {
      const result = await backupToDrive();
      toast({
        title: t("driveSuccess"),
        description: `${result.locationCount} ${t("driveBackupScopeShort")}`,
        variant: "success",
      });
      await refresh();
    } catch (e) {
      toast({ title: t("driveFailed"), description: String(e), variant: "destructive" });
    } finally {
      setBacking(false);
    }
  }

  async function handleRestore() {
    setConfirmRestore(false);
    setRestoring(true);
    try {
      const result = await restoreFromDrive();
      toast({
        title: t("driveRestoreSuccess"),
        description: `${result.imported} ${t("driveRestoreImported")}, ${result.skipped} ${t("driveRestoreSkipped")}`,
        variant: "success",
      });
    } catch (e) {
      toast({ title: t("driveRestoreFailed"), description: String(e), variant: "destructive" });
    } finally {
      setRestoring(false);
    }
  }

  async function handleDisconnect() {
    setConfirmDisconnect(false);
    setDisconnecting(true);
    try {
      const result = await disconnectDrive();
      if (!result.ok && result.reason === "ONLY_AUTH_METHOD") {
        toast({
          title: t("driveDisconnectBlocked"),
          description: t("driveDisconnectBlockedHint"),
          variant: "destructive",
        });
        return;
      }
      await refresh();
      toast({ title: t("driveDisconnected"), variant: "success" });
    } catch {
      toast({ title: t("driveFailed"), variant: "destructive" });
    } finally {
      setDisconnecting(false);
    }
  }

  const cloudIsNewer =
    status?.driveModifiedAt &&
    status.lastBackupAt &&
    new Date(status.driveModifiedAt) > status.lastBackupAt;

  return (
    <section className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
      <div className="flex items-center gap-2 font-bold text-sm">
        <Cloud className="h-4 w-4" style={{ color: DRIVE_BLUE }} />
        {t("cloudBackup")}
      </div>

      {/* Scope hint — tells the user what is backed up */}
      <p className="text-sm text-muted-foreground">{t("driveBackupScope")}</p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : !status?.connected ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("driveConnectHint")}</p>
          <Link href="/api/drive/connect" prefetch={false}>
            <Button variant="outline" className="rounded-xl gap-2">
              <DriveLogo />
              {t("driveConnect")}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Connection status row */}
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            <span className="text-green-700 dark:text-green-400 font-medium">{t("driveConnected")}</span>
            <button
              onClick={() => setConfirmDisconnect(true)}
              disabled={disconnecting}
              className="ms-auto text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("driveDisconnect")}
            </button>
          </div>

          {/* Disconnect confirm inline */}
          {confirmDisconnect && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="flex-1">{t("driveDisconnectConfirm")}</span>
              <Button size="sm" variant="destructive" className="h-7 text-xs rounded-lg" onClick={handleDisconnect}>
                {t("driveDisconnect")}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg" onClick={() => setConfirmDisconnect(false)}>
                {t("cancel")}
              </Button>
            </div>
          )}

          {/* Auto backup toggle */}
          <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5">
            <div className="flex-1 space-y-0.5">
              <Label htmlFor="drive-auto" className="text-sm font-medium">
                {t("driveAutoBackup")}
              </Label>
              <p className="text-xs text-muted-foreground">{t("driveAutoBackupHint")}</p>
            </div>
            <Switch
              id="drive-auto"
              checked={status.autoBackup}
              onCheckedChange={async (v) => {
                try {
                  await setDriveAutoBackup(v);
                  setStatus((s) => (s ? { ...s, autoBackup: v } : s));
                  toast({ title: t("settingsSaved"), variant: "success" });
                } catch {
                  toast({ title: t("settingsFailed"), variant: "destructive" });
                }
              }}
            />
          </div>

          {/* Last backup time */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {status.lastBackupAt ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                {t("driveLastBackup")}:{" "}
                <span className="font-medium text-foreground">
                  {formatDistanceToNow(status.lastBackupAt, { addSuffix: true })}
                </span>
              </>
            ) : (
              <>
                <CloudOff className="h-3.5 w-3.5 shrink-0" />
                {t("driveNeverBacked")}
              </>
            )}
          </div>

          {/* Cloud-is-newer banner */}
          {cloudIsNewer && (
            <div className={cn(
              "flex items-center gap-2 p-2.5 rounded-xl text-xs",
              "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300"
            )}>
              <AlertCircle className="h-4 w-4 shrink-0" />
              {t("driveCloudNewer")}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" disabled={backing} onClick={handleBackup}>
              {backing
                ? <><Loader2 className="h-4 w-4 animate-spin" />{t("driveBackingUp")}</>
                : <><Cloud className="h-4 w-4" />{t("driveBackupNow")}</>
              }
            </Button>
            {status.driveFileId && !confirmRestore && (
              <Button variant="outline" className="rounded-xl" disabled={restoring} onClick={() => setConfirmRestore(true)}>
                <Download className="h-4 w-4" />{t("driveRestore")}
              </Button>
            )}
            {status.driveFileId && (
              <Button
                variant="ghost"
                className="rounded-xl"
                disabled={testing}
                onClick={async () => {
                  setTesting(true);
                  try {
                    const r = await dryRunRestoreFromDrive();
                    setDryRun({
                      wouldImport: r.wouldImport,
                      wouldSkip: r.wouldSkip,
                      totalInBackup: r.totalInBackup,
                      sampleTitles: r.sampleTitles,
                    });
                    toast({
                      title: t("driveDryRunOk"),
                      description: t("driveDryRunDetail", {
                        import: r.wouldImport,
                        skip: r.wouldSkip,
                        total: r.totalInBackup,
                      }),
                      variant: "success",
                    });
                    await refresh();
                  } catch (e) {
                    toast({ title: t("driveDryRunFailed"), description: String(e), variant: "destructive" });
                  } finally {
                    setTesting(false);
                  }
                }}
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {t("driveDryRun")}
              </Button>
            )}
          </div>

          {status.lastRestoreTestAt && (
            <p className="text-xs text-muted-foreground">
              {t("driveLastRestoreTest")}:{" "}
              <span className="font-medium text-foreground">
                {formatDistanceToNow(status.lastRestoreTestAt, { addSuffix: true })}
              </span>
            </p>
          )}

          {dryRun && (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2 text-xs">
              <p className="font-semibold text-sm">{t("driveConflictTitle")}</p>
              <p className="text-muted-foreground">
                {t("driveDryRunDetail", {
                  import: dryRun.wouldImport,
                  skip: dryRun.wouldSkip,
                  total: dryRun.totalInBackup,
                })}
              </p>
              {dryRun.wouldSkip > 0 && (
                <p className="text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {t("driveConflictSkipHint", { count: dryRun.wouldSkip })}
                </p>
              )}
              {dryRun.sampleTitles.length > 0 && (
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                  {dryRun.sampleTitles.map((title) => (
                    <li key={title} className="truncate">{title}</li>
                  ))}
                </ul>
              )}
              <p className="text-muted-foreground">{t("driveConflictMergeHint")}</p>
            </div>
          )}

          {/* Restore confirm inline */}
          {confirmRestore && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="flex-1">
                {t("driveRestoreConfirm")}
                {dryRun && dryRun.wouldSkip > 0
                  ? ` ${t("driveConflictSkipHint", { count: dryRun.wouldSkip })}`
                  : ""}
              </span>
              <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" disabled={restoring} onClick={handleRestore}>
                {restoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("driveRestore")}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg" onClick={() => setConfirmRestore(false)}>
                {t("cancel")}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** Public wrapper that provides the required Suspense boundary for useSearchParams. */
export function DriveBackupSection() {
  return (
    <Suspense fallback={
      <section className="rounded-2xl border border-border/50 bg-card/50 p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      </section>
    }>
      <DriveBackupInner />
    </Suspense>
  );
}
