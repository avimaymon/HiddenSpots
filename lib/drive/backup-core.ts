import { prisma } from "@/lib/db";
import {
  refreshAccessToken,
  uploadBackupFile,
} from "@/lib/providers/google-drive";

export type BackupCoreResult = {
  fileId: string;
  locationCount: number;
  backedUpAt: Date;
};

/** Resolve a live Google access token for a user (Drive scope). */
export async function resolveDriveAccessToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: { access_token: true, refresh_token: true, expires_at: true },
  });
  if (!account?.refresh_token) throw new Error("DRIVE_NOT_CONNECTED");

  const nowSec = Math.floor(Date.now() / 1000);
  const expired = account.expires_at ? nowSec > account.expires_at - 60 : true;

  if (!expired && account.access_token) return account.access_token;

  const newToken = await refreshAccessToken(account.refresh_token);
  await prisma.account.updateMany({
    where: { userId, provider: "google" },
    data: { access_token: newToken, expires_at: nowSec + 3600 },
  });
  return newToken;
}

/** Backup one user's spots to Drive — callable from server actions or cron. */
export async function backupUserToDrive(userId: string): Promise<BackupCoreResult> {
  const accessToken = await resolveDriveAccessToken(userId);

  const locations = await prisma.location.findMany({
    where: { userId, deletedAt: null },
    select: {
      title: true,
      latitude: true,
      longitude: true,
      altitude: true,
      description: true,
      address: true,
      createdAt: true,
      isFavorite: true,
      isBucketList: true,
      isVisited: true,
      privacy: true,
      category: { select: { name: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { title: "asc" },
  });

  const geojsonFeatures = locations.map((loc) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [loc.longitude, loc.latitude, ...(loc.altitude ? [loc.altitude] : [])],
    },
    properties: {
      name: loc.title,
      description: loc.description,
      address: loc.address,
      created: loc.createdAt.toISOString(),
      "hs:isFavorite": loc.isFavorite,
      "hs:isBucketList": loc.isBucketList,
      "hs:isVisited": loc.isVisited,
      "hs:privacy": loc.privacy,
      "hs:category": loc.category?.name ?? null,
      "hs:tags": loc.tags.map((t) => t.tag.name),
    },
  }));

  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    source: "hiddenspots",
    locationCount: locations.length,
    locations: { type: "FeatureCollection", features: geojsonFeatures },
  };

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { driveFileId: true },
  });

  const fileId = await uploadBackupFile(
    accessToken,
    JSON.stringify(payload, null, 2),
    existing?.driveFileId ?? null
  );

  const backedUpAt = new Date();
  const next = new Date(backedUpAt.getTime() + 24 * 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: {
      driveFileId: fileId,
      driveLastBackupAt: backedUpAt,
      driveNextBackupAt: next,
    },
  });

  return { fileId, locationCount: locations.length, backedUpAt };
}
