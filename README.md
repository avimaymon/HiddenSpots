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
| `npm run dev` | Local development (needs your own Postgres in `.env.local`) |
| `npm run dev:local` | Zero-config: boots an embedded Postgres, **overwrites `.env.local`**, pushes the schema, starts Next |
| `npm run build` | `prisma generate` + `next build` |
| `npm run build:deploy` | Generate + `migrate deploy` + build (Vercel) |
| `npm run db:migrate` | Create/apply migrations locally |
| `npm run db:migrate:deploy` | Apply migrations (production) |
| `npm run db:push` | Push schema without migration history (dev only) |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:studio` | Prisma Studio |
| `npm run icons` | Regenerate PWA icons from the source SVG |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (warnings fail) |
| `npm test` | Vitest unit suite |
| `npm run test:integration` | Vitest against a throwaway Postgres with the real migration history applied |
| `npm run check:i18n` | Hebrew/English message key parity |
| `npm run test:e2e` | Playwright — 4 specs × 3 device projects (320px RTL, 360px RTL, 390px LTR). Specs needing a session self-skip unless `TEST_EMAIL`/`TEST_PASSWORD` are set |

> `npm run dev:local` writes `.env.local` unconditionally and mints a new
> `AUTH_SECRET` each run, so it will clobber a `vercel env pull` and invalidate
> local sessions. Use `npm run dev` if you have your own database configured.

## Before you push

```bash
npm run typecheck && npm run lint && npm test && npm run check:i18n && npm run build
```

CI runs the same set, plus `npm run test:integration`, `npm audit`, and
Playwright on all three device projects.

## Environment

See [`.env.example`](.env.example) and [PRODUCTION.md](PRODUCTION.md). Required:

- `DATABASE_URL` / `DIRECT_URL` (Neon)
- `AUTH_SECRET` / `AUTH_URL`
- Optional: `BLOB_READ_WRITE_TOKEN`, Mapbox / Google Maps keys

## Docs

- [PLAN.md](PLAN.md) — product & architecture plan
- [PLAN_STATUS.md](PLAN_STATUS.md) — implementation checklist
- [PRODUCTION.md](PRODUCTION.md) — deploy, env, health check
