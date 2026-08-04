-- Sign-in, registration and password reset now match email case-insensitively
-- (lib/auth/email.ts). Existing rows were stored in whatever case was typed,
-- so without this backfill anyone who registered with a capital letter would
-- stop being found by the normalised lookup and be locked out.
--
-- Rows whose lowercase form already belongs to a different account are left
-- untouched: those are genuine duplicate registrations created by the bug, and
-- silently collapsing them here would either fail the migration on the unique
-- index or destroy one account's data. They keep working exactly as they do
-- today and are reported by the query in PRODUCTION.md for manual merge.
UPDATE "User" u
SET "email" = lower(u."email")
WHERE u."email" IS NOT NULL
  AND u."email" <> lower(u."email")
  AND NOT EXISTS (
    SELECT 1 FROM "User" other
    WHERE other."id" <> u."id"
      AND other."email" = lower(u."email")
  );
