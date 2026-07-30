"use server";

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
}

export interface RestoreDryRunResult {
  wouldImport: number;
  wouldSkip: number;
  totalInBackup: number;
  sampleTitles: string[];
  testedAt: Date;
}

type BackupFeature = {
  geometry: { coordinates: [number, number, number?] };
  properties: {
    name?: string;
    description?: string | null;
    address?: string | null;
    "hs:isFavorite"?: boolean;
    "hs:isBucketList"?: boolean;
    "hs:isVisited"?: boolean;
    "hs:privacy"?: string;
    "hs:tags"?: string[];
  };
};

async function loadBackupFeatures(userId: string): Promise<BackupFeature[]> {
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

  const raw = await downloadBackupFile(accessToken, fileId);
  const payload = JSON.parse(raw) as {
    version: number;
    locations: { features: BackupFeature[] };
  };
  return payload.locations?.features ?? [];
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

  const features = await loadBackupFeatures(userId);
  const existing = await prisma.location.findMany({
    where: { userId, deletedAt: null },
    select: { latitude: true, longitude: true },
  });

  let wouldImport = 0;
  let wouldSkip = 0;
  const sampleTitles: string[] = [];

  for (const f of features) {
    const [lng, lat] = f.geometry.coordinates;
    const title = f.properties?.name ?? "Restored Location";
    if (isDupeOf(lat, lng, existing)) {
      wouldSkip++;
    } else {
      wouldImport++;
      if (sampleTitles.length < 5) sampleTitles.push(title);
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
    totalInBackup: features.length,
    sampleTitles,
    testedAt,
  };
}

export async function restoreFromDrive(): Promise<RestoreResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const features = await loadBackupFeatures(userId);
  const existing = await prisma.location.findMany({
    where: { userId, deletedAt: null },
    select: { latitude: true, longitude: true },
  });

  let imported = 0;
  let skipped = 0;

  for (const f of features) {
    const [lng, lat] = f.geometry.coordinates;
    const p = f.properties ?? {};
    const title = p.name ?? "Restored Location";

    if (isDupeOf(lat, lng, existing)) {
      skipped++;
      continue;
    }

    const VALID_PRIVACY = ["PRIVATE", "SHARED", "PUBLIC", "SECRET"] as const;
    type Privacy = (typeof VALID_PRIVACY)[number];
    const privacy: Privacy = VALID_PRIVACY.includes(p["hs:privacy"] as Privacy)
      ? (p["hs:privacy"] as Privacy)
      : "PRIVATE";

    const loc = await prisma.location.create({
      data: {
        userId,
        title,
        description: p.description ?? null,
        address: p.address ?? null,
        latitude: lat,
        longitude: lng,
        isFavorite: p["hs:isFavorite"] ?? false,
        isBucketList: p["hs:isBucketList"] ?? false,
        isVisited: p["hs:isVisited"] ?? false,
        privacy,
      },
    });

    const tagNames = p["hs:tags"] ?? [];
    for (const tagName of tagNames) {
      const tag = await prisma.tag.upsert({
        where: { name_userId: { name: tagName, userId } },
        create: { userId, name: tagName },
        update: {},
      });
      await prisma.tagOnLocation.upsert({
        where: { locationId_tagId: { locationId: loc.id, tagId: tag.id } },
        create: { locationId: loc.id, tagId: tag.id },
        update: {},
      });
    }

    existing.push({ latitude: lat, longitude: lng });
    imported++;
  }

  revalidateAppPaths("/locations");
  return { imported, skipped };
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
