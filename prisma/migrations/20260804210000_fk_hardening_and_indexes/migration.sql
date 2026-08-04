-- Schema hardening: FK cascades, orphan cleanup, real FKs for Track /
-- LocationHistory, share-token default removal, and hot-path indexes.
--
-- Why: 0_init compiled two relations to ON DELETE RESTRICT. Postgres checks
-- RESTRICT per row and non-deferrably, so `DELETE FROM "User"` fails for
-- anyone holding a single trip stop or a single share — the GDPR account
-- deletion path was broken for most accounts. Track.userId and
-- LocationHistory.userId had no FK at all, so those rows (LocationHistory
-- snapshots include privateNotes) survived account deletion indefinitely.

-- ─── Orphan cleanup ─────────────────────────────────────────────────────────
-- Must run BEFORE the ADD CONSTRAINT below, or the ALTER fails on any existing
-- row whose user is already gone. Inspect first in production with:
--   SELECT count(*) FROM "Track" WHERE "userId" NOT IN (SELECT "id" FROM "User");
DELETE FROM "Track" WHERE "userId" NOT IN (SELECT "id" FROM "User");
DELETE FROM "LocationHistory" WHERE "userId" NOT IN (SELECT "id" FROM "User");

-- ─── Share.sharedById: RESTRICT -> CASCADE ──────────────────────────────────
ALTER TABLE "Share" DROP CONSTRAINT IF EXISTS "Share_sharedById_fkey";
ALTER TABLE "Share" ADD CONSTRAINT "Share_sharedById_fkey"
  FOREIGN KEY ("sharedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── TripLocation.locationId: RESTRICT -> CASCADE ───────────────────────────
ALTER TABLE "TripLocation" DROP CONSTRAINT IF EXISTS "TripLocation_locationId_fkey";
ALTER TABLE "TripLocation" ADD CONSTRAINT "TripLocation_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Track.userId / LocationHistory.userId: no FK -> CASCADE ────────────────
DO $$ BEGIN
  ALTER TABLE "Track" ADD CONSTRAINT "Track_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LocationHistory" ADD CONSTRAINT "LocationHistory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Note: Share.publicToken's `@default(cuid())` was generated client-side by
-- Prisma, never as a Postgres DEFAULT, so removing it is a schema.prisma-only
-- change with no SQL counterpart. Tokens now come from lib/shares/token.ts.

-- ─── Hot-path indexes ───────────────────────────────────────────────────────
-- Share is looked up by resource on every permission check.
CREATE INDEX IF NOT EXISTS "Share_locationId_idx" ON "Share"("locationId");
CREATE INDEX IF NOT EXISTS "Share_collectionId_idx" ON "Share"("collectionId");
CREATE INDEX IF NOT EXISTS "Share_tripId_idx" ON "Share"("tripId");
CREATE INDEX IF NOT EXISTS "Track_locationId_idx" ON "Track"("locationId");

-- Matches the atlas keyset page ORDER BY [updatedAt DESC, id DESC] under
-- userId, including the tiebreak. On a large table consider running this as
-- CREATE INDEX CONCURRENTLY out-of-band instead: `prisma migrate deploy` wraps
-- each migration in a transaction, and CONCURRENTLY cannot run inside one.
CREATE INDEX IF NOT EXISTS "Location_userId_updatedAt_id_idx"
  ON "Location"("userId", "updatedAt" DESC, "id" DESC);
