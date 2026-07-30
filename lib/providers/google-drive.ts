/**
 * Thin Google Drive REST v3 client.
 * Uses fetch — no extra dependencies.
 *
 * Scope required: https://www.googleapis.com/auth/drive.file
 * (access only to files the app creates — not the full Drive)
 */

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const BACKUP_FILENAME = "hiddenspots-backup.json";
const BACKUP_MIME = "application/json";

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

/** Refresh an expired access token using the stored refresh token. */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error("Failed to refresh Google access token");
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

/** Find the backup file in Drive. Returns null if not found. */
export async function findBackupFile(accessToken: string): Promise<DriveFile | null> {
  const q = encodeURIComponent(`name='${BACKUP_FILENAME}' and trashed=false`);
  const res = await fetch(
    `${DRIVE_API}/files?q=${q}&fields=files(id,name,modifiedTime)&spaces=drive`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Drive list error: ${res.status}`);
  const data = await res.json() as { files: DriveFile[] };
  return data.files[0] ?? null;
}

/** Upload (create or update) the backup JSON file. Returns the file ID. */
export async function uploadBackupFile(
  accessToken: string,
  content: string,
  existingFileId?: string | null
): Promise<string> {
  const metadata = { name: BACKUP_FILENAME, mimeType: BACKUP_MIME };
  const body = new FormData();
  body.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  body.append("file", new Blob([content], { type: BACKUP_MIME }));

  if (existingFileId) {
    const res = await fetch(
      `${DRIVE_UPLOAD}/files/${existingFileId}?uploadType=multipart`,
      { method: "PATCH", headers: { Authorization: `Bearer ${accessToken}` }, body }
    );
    if (!res.ok) throw new Error(`Drive update error: ${res.status}`);
    const data = await res.json() as { id: string };
    return data.id;
  }

  const res = await fetch(
    `${DRIVE_UPLOAD}/files?uploadType=multipart`,
    { method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body }
  );
  if (!res.ok) throw new Error(`Drive create error: ${res.status}`);
  const data = await res.json() as { id: string };
  return data.id;
}

/** Download backup file content by file ID. */
export async function downloadBackupFile(
  accessToken: string,
  fileId: string
): Promise<string> {
  const res = await fetch(
    `${DRIVE_API}/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Drive download error: ${res.status}`);
  return res.text();
}

/** Get file metadata (e.g. modifiedTime) for a known file ID. */
export async function getFileMetadata(
  accessToken: string,
  fileId: string
): Promise<DriveFile> {
  const res = await fetch(
    `${DRIVE_API}/files/${fileId}?fields=id,name,modifiedTime`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Drive metadata error: ${res.status}`);
  return res.json() as Promise<DriveFile>;
}
