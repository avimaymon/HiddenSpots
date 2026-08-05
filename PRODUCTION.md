# HiddenSpots — Production Deployment

## Quick deploy (Vercel)

```bash
npm i -g vercel
vercel link
vercel env pull .env.local
vercel --prod
```

## Required environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | yes | Neon pooled (`?pgbouncer=true`) |
| `DIRECT_URL` | yes | Neon direct (migrations) |
| `AUTH_SECRET` | yes | `openssl rand -base64 32` |
| `AUTH_URL` | yes | `https://your-app.vercel.app` |
| `BLOB_READ_WRITE_TOKEN` | yes in practice | Photo upload fails at runtime without it |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | strongly recommended | **Without these there is effectively no rate limiting on Vercel** — every limit, including the fail-closed ones on login and password reset, falls back to a per-instance in-memory map that resets on each cold start |
| `CRON_SECRET` | for Drive cron | Bearer for `/api/cron/drive-backup`; the route returns 503 rather than running unprotected when unset |
| `RESEND_API_KEY` / `EMAIL_FROM` | for password reset | Reset emails silently do not send without these |
| `ERROR_WEBHOOK_URL` | recommended | Slack/Discord incoming webhook — receives client errors, feedback, and production smoke failures |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | if Mapbox | |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | if Google | |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | optional | Set + `NEXT_PUBLIC_ANALYTICS_PROVIDER=plausible` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | optional | Web push |

`AUTH_SECRET` is validated at boot: a production deploy without it now fails to
start rather than erroring at the first request that needs it. The optional
values above are logged as warnings at boot with their consequence.

**Rotating `AUTH_SECRET` moves SECRET share pins.** Sessions are JWT, so rotation
already signs everyone out; it additionally re-derives the coordinate fuzz seed,
so fuzzed pins shift within their radius. Expected, not a bug.

See [`.env.example`](.env.example) for the full list.

## Migration baseline (first deploy after `db push`)

Schema was historically applied with `prisma db push`. Vercel builds with `migrate deploy`. On an existing Neon DB once:

```bash
npx prisma migrate resolve --applied 0_init
npx prisma migrate resolve --applied 20260723010944_add_drive_backup
npx prisma migrate deploy
```

After that, only `prisma migrate deploy` (via `build:deploy`). New changes: `npm run db:migrate` locally — never `db:push` against prod.

## Build pipeline

- **Local:** `npm run build`
- **Vercel:** `npm run build:deploy` (= `prisma generate` → `migrate deploy` → `next build`)
- **Region:** `fra1` (Frankfurt) — `vercel.json`
- **Cron:** daily `0 3 * * *` → `/api/cron/drive-backup` (users with Drive auto-backup on)

## Health check

```
GET /api/health
→ { "status": "ok" }
```

## Smoke test (phone, `/he/app`)

- [ ] `/api/health` returns 200
- [ ] Sign in (Google / credentials)
- [ ] Add spot from GPS FAB
- [ ] Log visit (+ photo if Blob configured)
- [ ] Open `/he/share/[token]` logged out
- [ ] Airplane mode → offline banner
- [ ] Settings → Sun theme readable outdoors
- [ ] Search: `מפלים לכלבים` shows smart-filter chips
- [ ] Feedback button submits
- [ ] Drive: connect + enable daily auto-backup (needs `CRON_SECRET`)

## Monitoring

- Vercel → Analytics + Speed Insights
- Logs: `vercel logs --prod`. Application logs are single-line JSON with a `tag`
  field — filter with e.g. `vercel logs --prod | grep '"tag":"client-error"'`.
- `.github/workflows/prod-smoke.yml` runs daily against the `PRODUCTION_URL`
  repository variable and posts to `ERROR_WEBHOOK_URL` on failure.
- Plausible when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set
- Feedback rows: Prisma Studio → `Feedback`

---

# Runbook

## A client error report came in

Client errors POST to `/api/client-error`, which logs one JSON line and forwards
to `ERROR_WEBHOOK_URL`. Each carries a `digest` — the **only** key linking it to
the server-side log line for the same failure:

```bash
vercel logs --prod | grep '<digest>'
```

`[global-error]` in the message means the crash was in the root layout, which
takes down every route rather than one page. Treat as sev-1.

## `/api/health` returns 503

The route only ever returns 503 when `SELECT 1` against Postgres fails, and it
deliberately does not leak the error. In order:

1. Neon console → is the project active, suspended, or over its limit? Neon
   auto-suspends idle branches; the first request after suspend can time out.
2. Was a migration deployed recently? `npx prisma migrate status` — a partially
   applied migration leaves the DB in a state the app cannot use.
3. `vercel logs --prod | grep '"tag":"health"'` for the underlying driver error.
4. Check `DATABASE_URL` is the **pooled** Neon URL (`?pgbouncer=true`) and
   `DIRECT_URL` the direct one. Swapped values exhaust connections under load.

## Rolling back a bad deploy

```bash
vercel rollback
```

**Migrations do not roll back with the deploy.** `vercel.json` runs
`build:deploy`, which applies `prisma migrate deploy` *before* `next build`, on
preview deploys too. So a rollback restores the old code against the new schema.
Before deploying a migration that drops or renames anything, confirm the
previous release still runs against the new schema — otherwise the rollback path
is a restore, not a `vercel rollback`.

## Restoring the database

Neon keeps point-in-time history (retention depends on plan):

1. Neon console → Branches → **Restore** → pick a timestamp before the incident.
2. Restore into a **new branch** first and verify, never in place.
3. Repoint `DATABASE_URL` / `DIRECT_URL` at the restored branch and redeploy.
4. `npx prisma migrate status` against the restored branch before taking traffic.

Per-user data has a second path: Settings → Backup → Google Drive restore, which
has a dry-run preview.

## A migration failed mid-deploy

`prisma migrate deploy` marks the migration failed and refuses to continue.

```bash
npx prisma migrate status
# after fixing the cause, one of:
npx prisma migrate resolve --rolled-back <migration_name>
npx prisma migrate resolve --applied    <migration_name>
```

Never edit an already-applied migration file — write a new one. Note the history
must build a **fresh** database, not just the production one: the `integration`
CI job boots a throwaway Postgres and runs the full history for exactly this
reason (it caught `0_init` being unrunnable).

## Suspected token or secret exposure

- **A share link leaked**: Settings → Sharing → *New link* on that share, or
  revoke it. Rotating issues a fresh `randomBytes(32)` token and invalidates the
  old URL immediately.
- **Many links, or SECRET spots**: `node scripts/rotate-secret-tokens.mjs
  --dry-run` then without the flag — reissues every SECRET-backed share token and
  notifies each owner.
- **`AUTH_SECRET` exposed**: rotate in Vercel and redeploy. This signs out every
  user, invalidates in-flight Drive OAuth states, and moves fuzzed SECRET pins.

## Someone cannot sign in after the email-case migration

Sign-in, registration and password reset match email case-insensitively
(`lib/auth/email.ts`). The `normalize_user_email_case` migration lowercases
existing rows so nobody is locked out by the change.

It deliberately **skips** any row whose lowercase form is already taken by a
different account — those are genuine duplicate registrations the old
case-sensitive lookup allowed, and collapsing them automatically would either
violate the unique index or destroy one account's data. Those users keep
signing in exactly as before, with the case they registered with.

Find them:

```sql
SELECT lower("email") AS normalized,
       count(*)       AS accounts,
       array_agg("id" ORDER BY "createdAt") AS ids
FROM "User"
WHERE "email" IS NOT NULL
GROUP BY lower("email")
HAVING count(*) > 1;
```

Each group is one person with two accounts. There is no safe automatic merge —
both may hold spots, visits and shares. Contact them, confirm which account to
keep, move anything worth keeping, then delete the other through the normal
GDPR path so the cascades run.

## Deleting a user's account (GDPR)

Self-service via Settings → Account. The cascade removes every owned row; photo
blobs are deleted best-effort after the DB delete and the action reports
`blobsOrphaned` if any could not be removed. To confirm afterwards:

```sql
SELECT count(*) FROM "Track"           WHERE "userId" = '<id>';
SELECT count(*) FROM "LocationHistory" WHERE "userId" = '<id>';
```

Both must be 0 — they were unconstrained columns before the FK hardening
migration and could previously outlive the account.
