-- Add clientId columns for offline idempotency
ALTER TABLE "Location" ADD COLUMN "clientId" TEXT;
ALTER TABLE "Collection" ADD COLUMN "clientId" TEXT;
ALTER TABLE "Trip" ADD COLUMN "clientId" TEXT;
ALTER TABLE "Visit" ADD COLUMN "clientId" TEXT;
ALTER TABLE "LocationPhoto" ADD COLUMN "clientId" TEXT;

-- Add unique constraints for idempotent deduplication
ALTER TABLE "Location" ADD CONSTRAINT "Location_userId_clientId_key" UNIQUE ("userId", "clientId");
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_userId_clientId_key" UNIQUE ("userId", "clientId");
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_userId_clientId_key" UNIQUE ("userId", "clientId");
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_userId_clientId_key" UNIQUE ("userId", "clientId");
ALTER TABLE "LocationPhoto" ADD CONSTRAINT "LocationPhoto_clientId_key" UNIQUE ("clientId");
