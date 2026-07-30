-- Add Google Drive backup fields to User.
-- Uses IF NOT EXISTS so this is safe to run against a database
-- that was previously bootstrapped with `prisma db push`.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "driveFileId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "driveLastBackupAt" TIMESTAMP(3);
