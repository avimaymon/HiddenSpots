# HiddenSpots

Personal & collaborative atlas for nature locations — map-first, Hebrew-first (RTL), English secondary. Deployed on Vercel.

**Main app:** `/he/app` (English: `/en/app`)

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind 4 · Prisma / PostgreSQL · NextAuth · Mapbox / Google Maps / Leaflet · next-intl · PWA

## Getting started

```bash
npm ci
cp .env.example .env.local   # fill in DATABASE_URL, AUTH_SECRET, etc.
npm run db:migrate          # local: prisma migrate dev (or db:push for throwaway DBs)
npm run dev
```

Open [http://localhost:3000/he/app](http://localhost:3000/he/app).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development |
| `npm run build` | `prisma generate` + `next build` |
| `npm run build:deploy` | Generate + `migrate deploy` + build (Vercel) |
| `npm run db:migrate` | Create/apply migrations locally |
| `npm run db:migrate:deploy` | Apply migrations (production) |
| `npm run db:push` | Push schema without migration history (dev only) |
| `npm run db:studio` | Prisma Studio |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run check:i18n` | Hebrew/English message key parity |
| `npm run test:e2e` | Playwright smoke tests |

## Environment

See [`.env.example`](.env.example) and [PRODUCTION.md](PRODUCTION.md). Required:

- `DATABASE_URL` / `DIRECT_URL` (Neon)
- `AUTH_SECRET` / `AUTH_URL`
- Optional: `BLOB_READ_WRITE_TOKEN`, Mapbox / Google Maps keys

## Docs

- [PLAN.md](PLAN.md) — product & architecture plan
- [PLAN_STATUS.md](PLAN_STATUS.md) — implementation checklist
- [PRODUCTION.md](PRODUCTION.md) — deploy, env, health check
