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
| `DATABASE_URL` | ✅ | Neon pooled connection (`?pgbouncer=true`) |
| `DIRECT_URL` | ✅ | Neon direct (migrations / db push) |
| `AUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `AUTH_URL` | ✅ | `https://your-app.vercel.app` |
| `BLOB_READ_WRITE_TOKEN` | Recommended | Image uploads in production |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | If using Mapbox | |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | If using Google | |

## Build pipeline

- **Local:** `npm run build`
- **Vercel:** `npm run build:deploy` (= `prisma generate` → `db push` → `next build`)
- **Region:** `fra1` (Frankfurt) — configured in `vercel.json`

## Health check

```
GET /api/health
→ { "status": "ok" }
```

## Performance optimizations (built-in)

| Area | Implementation |
|------|----------------|
| Map bundle | Dynamic import per provider (Mapbox/Google/Leaflet) |
| Map data | Lean Prisma `select` — no full location payload |
| Categories | `unstable_cache` 5 min TTL |
| Images | AVIF/WebP via `next/image`, 30-day cache |
| Lists | Virtual scroll @ 40+ items (`@tanstack/react-virtual`) |
| Cards | `React.memo` on `LocationCard` |
| Packages | `optimizePackageImports` for lucide, radix, date-fns |
| PWA | Service worker caches static assets |
| API | Rate limits on `/api/upload`, `/api/geocode` |
| DB | Prisma singleton (serverless-safe) |
| Security | HSTS, CSP headers, `poweredByHeader: false` |

## Post-deploy checklist

- [ ] `/api/health` returns 200
- [ ] `/he/app` loads map with markers
- [ ] Sign in (Google/GitHub/credentials)
- [ ] Upload photo (needs Blob token)
- [ ] `/he/share/[token]` public share works
- [ ] Lighthouse Mobile ≥ 85 (target 90)

## Monitoring

- Vercel → Analytics + Speed Insights (enable in dashboard)
- Logs: `vercel logs --prod`
- DB: Neon dashboard → connection pooling active
