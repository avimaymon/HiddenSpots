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
| `BLOB_READ_WRITE_TOKEN` | recommended | Image uploads |
| `CRON_SECRET` | for Drive cron | Bearer for `/api/cron/drive-backup` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | if Mapbox | |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | if Google | |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | optional | Set + `NEXT_PUBLIC_ANALYTICS_PROVIDER=plausible` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | optional | Web push |

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
- Logs: `vercel logs --prod`
- Plausible when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set
- Feedback rows: Prisma Studio → `Feedback`
