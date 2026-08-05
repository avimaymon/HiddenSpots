-- Offline idempotency keys.
--
-- Why: the offline queue removes an item only after its action resolves, so a
-- response lost on a flaky connection is retried. Without a key the server
-- cannot tell that retry from a genuine second spot, and the user comes home
-- from a trip with duplicates of everything they logged.
--
-- Nullable on purpose. Postgres treats NULLs as distinct in a unique index, so
-- unlimited online creates can share a NULL clientId while any two writes that
-- carry the *same* key collide. That is also why no backfill is needed.

ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "clientId" TEXT;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "clientId" TEXT;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "clientId" TEXT;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "clientId" TEXT;
ALTER TABLE "LocationPhoto" ADD COLUMN IF NOT EXISTS "clientId" TEXT;

-- ─── Deduplication constraints ──────────────────────────────────────────────
-- OPERATIONAL NOTE: each of these builds a unique index, which takes an ACCESS
-- EXCLUSIVE lock on the table for the duration of the build — and
-- `prisma migrate deploy` wraps the whole migration in one transaction, so the
-- locks are all held until it commits. On a small database that is
-- milliseconds. Once "Location" or "Visit" is large enough for the build to be
-- noticeable, do it out-of-band instead and let this migration find the index
-- already present:
--
--   CREATE UNIQUE INDEX CONCURRENTLY "Location_userId_clientId_key"
--     ON "Location" ("userId", "clientId");
--
-- (CONCURRENTLY cannot run inside a transaction, which is why it cannot simply
-- be written here.)
--
-- The unique index is what makes deduplication real: an application-level
-- "does it exist?" check is a read followed by a write, and two retries can
-- both pass it.
CREATE UNIQUE INDEX IF NOT EXISTS "Location_userId_clientId_key"
  ON "Location" ("userId", "clientId");
CREATE UNIQUE INDEX IF NOT EXISTS "Collection_userId_clientId_key"
  ON "Collection" ("userId", "clientId");
CREATE UNIQUE INDEX IF NOT EXISTS "Trip_userId_clientId_key"
  ON "Trip" ("userId", "clientId");
CREATE UNIQUE INDEX IF NOT EXISTS "Visit_userId_clientId_key"
  ON "Visit" ("userId", "clientId");
CREATE UNIQUE INDEX IF NOT EXISTS "LocationPhoto_clientId_key"
  ON "LocationPhoto" ("clientId");
