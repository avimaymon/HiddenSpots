import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { backupUserToDrive } from "@/lib/drive/backup-core";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Daily scheduled Drive backup for users with driveAutoBackup enabled.
 * Protected by CRON_SECRET (Vercel Cron sends Authorization: Bearer …).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await prisma.user.findMany({
    where: {
      driveAutoBackup: true,
      accounts: { some: { provider: "google", refresh_token: { not: null } } },
      OR: [{ driveNextBackupAt: null }, { driveNextBackupAt: { lte: now } }],
    },
    select: { id: true },
    // ponytail: batch cap — cron runs daily; raise if user count grows past tens
    take: 50,
  });

  let ok = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const u of due) {
    try {
      await backupUserToDrive(u.id);
      ok++;
    } catch (e) {
      failed++;
      // Don't echo user ids in cron responses/logs — keep failure shape only.
      const msg = e instanceof Error ? e.message.slice(0, 120) : "error";
      errors.push(msg);
      console.error("[cron/drive-backup] user backup failed", msg);
    }
  }

  return NextResponse.json({ processed: due.length, ok, failed, errors: errors.slice(0, 10) });
}
