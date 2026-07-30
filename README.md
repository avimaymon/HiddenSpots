# HiddenSpots

Personal & collaborative atlas for nature locations — map-first, Hebrew-first (RTL), English secondary. Deployed on Vercel.

**Main app:** `/he/app` (English: `/en/app`)

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind 4 · Prisma / PostgreSQL · NextAuth · Mapbox / Google Maps / Leaflet · next-intl · PWA

## Getting started

```bash
npm ci
cp .env.example .env.local   # fill in DATABASE_URL, AUTH_SECRET, etc.
npm run db:push
npm run dev
```

Open [http://localhost:3000/he/app](http://localhost:3000/he/app).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development |
| `npm run build` | `prisma generate` + `next build` |
| `npm run build:deploy` | Generate + `db push` + build (Vercel) |
| `npm run db:push` | Push Prisma schema to the database |
| `npm run db:studio` | Prisma Studio |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
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
