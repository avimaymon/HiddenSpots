<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# HiddenSpots conventions

Personal & collaborative atlas for nature spots. Map-first, **Hebrew-first (RTL)**,
English secondary. Next.js 16 · React 19 · Prisma/Postgres (Neon) · NextAuth v5 ·
Tailwind 4 · Serwist PWA. Vercel only — no separate backend.

`PLAN.md` is the product spec; §19 (narrow screens) and §2 (i18n) are the two
sections most often violated by new code. `PLAN_STATUS.md` tracks what shipped.

## Non-negotiables

**No hardcoded user-facing strings.** Every string goes through
`useTranslations()` / `getTranslations()`, and every key must exist in *both*
`messages/he/` and `messages/en/`. `npm run check:i18n` enforces parity and runs
in CI. Hebrew is the default and the one to get right first.

**RTL by logical properties.** `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`/`text-start`,
never `ml-`/`mr-`/`left-`/`right-`/`text-left`. The codebase is consistent about
this; keep it that way.

**Mobile-first at 320px.** Not 375. Touch targets ≥44px, no horizontal scroll,
`100dvh` + `env(safe-area-inset-*)` (see the CSS variables in `app/globals.css`).
`tests/e2e/narrow-rtl.spec.ts` asserts both rules on public routes.

## Server actions

Every export in `lib/actions/*.ts` starts with `requireAuth()`, and every query
is scoped by `userId`. Use the helpers in `lib/permissions/resource-access.ts`
(`assertOwnsLocation`, `assertOwnsCollection`, …) rather than hand-rolling the
check — they return "Not found" rather than "Forbidden" on purpose, so they do
not act as an existence oracle.

Collaborator access is a separate axis: `lib/permissions/share-access.ts`
distinguishes *targeted* grants (a real `sharedWithId`) from *open link* shares,
and `clampOpenSharePermission` caps open links at COMMENT. Never grant an
ambient permission from a share row with `sharedWithId === null`.

Enforce permissions on the **read** path too, not just writes.

## Sharing and privacy

Anything served to a share page goes through `lib/shares/public-location.ts`
(`toPublicLocation`) — an explicit allowlist. Never spread a raw Prisma location
row to a client. SECRET spots get their coordinates fuzzed with a seed derived
via HMAC over `AUTH_SECRET` (`lib/shares/fuzz-seed.ts`); **never seed the fuzz
with anything the recipient already holds**, which is what made it reversible
before. A share targets exactly one resource — `shareSchema` enforces it.

## Offline sync

`lib/offline/db.ts` is a Dexie store with a queue that flushes on reconnect.
Two rules when touching it:

- Anything with real logic must be extracted into a **pure module**
  (`lib/offline/coalesce.ts`, `id-map.ts`, `scope.ts`, …) — the vitest
  environment is `node`, so Dexie and `localStorage` are untestable directly.
  Every existing offline test follows this shape.
- The store is per-origin, not per-account. It is scoped by an `ownerUserId`
  meta row and purged on user mismatch; keep any new table inside that purge.

Queue writes are idempotent via `clientId`. Do not strip it before calling the
action — that is what allowed a lost response to duplicate a spot.

## Database

Migrations must be able to build a **fresh** database, not just mutate the
production one (`0_init` was unrunnable for months because production had been
baselined past it). `npm run test:integration` boots a throwaway Postgres and
applies the whole history — run it after any schema change.

New user-owned model: give it a real FK with `onDelete: Cascade` and a
back-relation on `User`, or account deletion will either fail or orphan rows.

## Verification

```bash
npm run typecheck && npm run lint && npm test && npm run check:i18n && npm run build
```

Plus `npm run test:integration` for schema changes. Do not report work as done on
a read-through when it can be executed.
