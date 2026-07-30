-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "driveLastRestoreTestAt" TIMESTAMP(3);
