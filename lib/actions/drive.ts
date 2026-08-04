"use server";

import { randomUUID } from "crypto";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { revalidateAppPaths } from "@/lib/revalidate";
import {
  findBackupFile,
  downloadBackupFile,
  getFileMetadata,
} from "@/lib/providers/google-drive";
import {
  backupUserToDrive,
  resolveDriveAccessToken,
  type BackupCoreResult,
} from "@/lib/drive/backup-core";
import { DUPE_SCAN_MAX } from "@/lib/export/limits";
import { rateLimit } from "@/lib/rate-limit";
import {
  parseBackup,
  type NormalizedFeature,
  type ParsedBackup,
} from "@/lib/drive/backup-schema";

async function getGoogleAccount(userId: string) {
  return prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: { access_token: true, refresh_token: true, expires_at: true },
  });
}

// ─── Status ──────────────────────────────────────────────────────────────────

export interface DriveStatus {
  connected: boolean;
  lastBackupAt: Date | null;
  driveFileId: string | null;
  driveModifiedAt: string | null;
  autoBackup: boolean;
  lastRestoreTestAt: Date | null;
}

export async function getDriveStatus(): Promise<DriveStatus> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const [user, account] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        driveFileId: true,
        driveLastBackupAt: true,
        driveAutoBackup: true,
        driveLastRestoreTestAt: true,
      },
    }),
    getGoogleAccount(userId),
  ]);

  const connected = Boolean(account?.refresh_token);
  let driveModifiedAt: string | null = null;

  if (connected && user?.driveFileId) {
    try {
      const token = await resolveDriveAccessToken(userId);
      const meta = await getFileMetadata(token, user.driveFileId);
      driveModifiedAt = meta.modifiedTime;
    } catch {
      // Drive file might have been deleted externally — ignore
    }
  }

  return {
    connected,
    lastBackupAt: user?.driveLastBackupAt ?? null,
    driveFileId: user?.driveFileId ?? null,
    driveModifiedAt,
    autoBackup: user?.driveAutoBackup ?? false,
    lastRestoreTestAt: user?.driveLastRestoreTestAt ?? null,
  };
}

export async function setDriveAutoBackup(enabled: boolean): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;
  const account = await getGoogleAccount(userId);
  if (!account?.refresh_token) throw new Error("DRIVE_NOT_CONNECTED");

  await prisma.user.update({
    where: { id: userId },
    data: {
      driveAutoBackup: enabled,
      driveNextBackupAt: enabled ? new Date() : null,
    },
  });
  revalidateAppPaths("/settings");
}

// ─── Backup ──────────────────────────────────────────────────────────────────

export type BackupResult = BackupCoreResult;

export async function backupToDrive(): Promise<BackupResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const result = await backupUserToDrive(session.user.id);
  revalidateAppPaths("/settings");
  return result;
}

// ─── Restore ─────────────────────────────────────────────────────────────────

export interface RestoreResult {
  imported: number;
  skipped: number;
  /** Features in the file, before the per-restore cap. */
  total: number;
  /** The file held more than RESTORE_FEATURES_MAX; the rest was not restored. */
  truncated: boolean;
  /** Features skipped because they failed validation (e.g. bad coordinates). */
  rejected: number;
}

export interface RestoreDryRunResult {
  wouldImport: number;
  wouldSkip: number;
  totalInBackup: number;
  sampleTitles: string[];
  testedAt: Date;
}

/**
 * Fetch and validate the backup.
 *
 * The file sits in the user's own Drive and is fully editable there, so it is
 * untrusted input that merely arrives over an authenticated channel — see
 * lib/drive/backup-schema.ts for the rules.
 */
async function loadBackup(userId: string): Promise<ParsedBackup> {
  const accessToken = await resolveDriveAccessToken(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { driveFileId: true },
  });

  let fileId = user?.driveFileId ?? null;
  if (!fileId) {
    const found = await findBackupFile(accessToken);
    if (!found) throw new Error("NO_BACKUP_FILE");
    fileId = found.id;
    await prisma.user.update({ where: { id: userId }, data: { driveFileId: fileId } });
  }

  return parseBackup(await downloadBackupFile(accessToken, fileId));
}

function isDupeOf(
  lat: number,
  lng: number,
  existing: { latitude: number; longitude: number }[]
): boolean {
  return existing.some((e) => {
    const dlat = (e.latitude - lat) * 111320;
    const dlng = (e.longitude - lng) * 111320 * Math.cos(lat * (Math.PI / 180));
    return Math.sqrt(dlat * dlat + dlng * dlng) < 50;
  });
}

/** Preview restore without writing — also records drill timestamp. */
export async function dryRunRestoreFromDrive(): Promise<RestoreDryRunResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const { features, total } = await loadBackup(userId);
  const existing = await prisma.location.findMany({
    where: { userId, deletedAt: null },
    select: { latitude: true, longitude: true },
    take: DUPE_SCAN_MAX,
    orderBy: { updatedAt: "desc" },
  });

  let wouldImport = 0;
  let wouldSkip = 0;
  const sampleTitles: string[] = [];

  for (const f of features) {
    if (isDupeOf(f.latitude, f.longitude, existing)) {
      wouldSkip++;
    } else {
      wouldImport++;
      if (sampleTitles.length < 5) sampleTitles.push(f.title);
    }
  }

  const testedAt = new Date();
  await prisma.user.update({
    where: { id: userId },
    data: { driveLastRestoreTestAt: testedAt },
  });
  revalidateAppPaths("/settings");

  return {
    wouldImport,
    wouldSkip,
    // The true count in the file, not the post-cap page — a dry run that
    // under-reported would defeat its own purpose.
    totalInBackup: total,
    sampleTitles,
    testedAt,
  };
}

export async function restoreFromDrive(): Promise<RestoreResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  // A restore writes the whole atlas back; rate limited so a stuck client
  // cannot replay it in a loop.
  const { ok } = await rateLimit(`drive-restore:${userId}`, 5, 60 * 60 * 1000);
  if (!ok) throw new Error("RATE_LIMITED");

  const { features, total, truncated, rejected } = await loadBackup(userId);
  const existing = await prisma.location.findMany({
    where: { userId, deletedAt: null },
    select: { latitude: true, longitude: true },
    take: DUPE_SCAN_MAX,
    orderBy: { updatedAt: "desc" },
  });

  // Decide everything up front, so the writes below are set-based. Within-file
  // duplicates are caught too, by growing `existing` as we go.
  const toCreate: (NormalizedFeature & { id: string })[] = [];
  let skipped = 0;
  for (const f of features) {
    if (isDupeOf(f.latitude, f.longitude, existing)) {
      skipped++;
      continue;
    }
    toCreate.push({ ...f, id: randomUUID() });
    existing.push({ latitude: f.latitude, longitude: f.longitude });
  }

  const tagNames = Array.from(new Set(toCreate.flatMap((f) => f.tags)));

  if (toCreate.length) {
    await prisma.$transaction(
      async (tx) => {
        await tx.location.createMany({
          data: toCreate.map((f) => ({
            id: f.id,
            userId,
            title: f.title,
            description: f.description,
            address: f.address,
            latitude: f.latitude,
            longitude: f.longitude,
            isFavorite: f.isFavorite,
            isBucketList: f.isBucketList,
            isVisited: f.isVisited,
            privacy: f.privacy,
          })),
        });

        if (tagNames.length) {
          // Two statements for every tag in the file, rather than two per tag
          // per spot — a 5,000-spot restore previously issued tens of
          // thousands of sequential round trips and could not finish.
          await tx.tag.createMany({
            data: tagNames.map((name) => ({ userId, name })),
            skipDuplicates: true,
          });
          const tags = await tx.tag.findMany({
            where: { userId, name: { in: tagNames } },
            select: { id: true, name: true },
          });
          const tagId = new Map(tags.map((t) => [t.name, t.id]));

          await tx.tagOnLocation.createMany({
            data: toCreate.flatMap((f) =>
              f.tags
                .map((name) => tagId.get(name))
                .filter((id): id is string => Boolean(id))
                .map((id) => ({ locationId: f.id, tagId: id }))
            ),
            skipDuplicates: true,
          });
        }
      },
      { timeout: 30_000 }
    );
  }

  revalidateAppPaths("/locations");
  return { imported: toCreate.length, skipped, total, truncated, rejected };
}

// ─── Disconnect ───────────────────────────────────────────────────────────────

export async function disconnectDrive(): Promise<
  { ok: true } | { ok: false; reason: "ONLY_AUTH_METHOD" }
> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      passwordHash: true,
      accounts: { select: { provider: true } },
    },
  });

  const hasPassword = Boolean(user?.passwordHash);
  const otherOAuth = user?.accounts.some((a) => a.provider !== "google") ?? false;

  if (!hasPassword && !otherOAuth) {
    return { ok: false, reason: "ONLY_AUTH_METHOD" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      driveFileId: null,
      driveLastBackupAt: null,
      driveAutoBackup: false,
      driveNextBackupAt: null,
    },
  });
  await prisma.account.deleteMany({ where: { userId, provider: "google" } });
  revalidateAppPaths("/settings");
  return { ok: true };
}
