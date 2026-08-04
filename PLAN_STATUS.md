# PLAN.md — Implementation status

Updated after T70–T107: security/privacy hardening, offline create/remap/discard/rename, visits load-more, update coalesce, auth rate limits, query ceilings, post-hike + tracks a11y, CI e2e Postgres smoke.

## Shipped

- Harden v1 · Field-ready · Later polish (sun, feedback, Drive cron, Hebrew NL, share perms)
- **A** One-tap I'm here · Nearby GPS sort · Go mode ETA/auto-arrive/offline · PWA after first spot
- **B** Share mini-landing + OG · My Maps URL import + KMZ · Collection share map/clone/WhatsApp CTA
- **C** Drive restore dry-run · ERROR_WEBHOOK_URL triage · Production smoke workflow
- **Field friction** Offline sync fail/retry UI · I'm here + optional photo · Go mode GPS pause on background · Hebrew empty CTAs (add / My Maps)
- **Growth** WhatsApp-native share copy · My Maps onboarding step · Invite hiking partner (collection)
- **Soft ops** Weekly dashboard self-stats · Settings ops health hints · `docs/FIELD_CHECKLIST.md`
- **Authz hardening** createShare ownership · open-link EDIT clamp · privateNotes stripped from public shares · stable SECRET fuzz · visit/collection/trip attach ownership · cloneCollection/cloneTrip access + deep-copy (no foreign FK alias) · comments/reports rate limits · notifications write path internal-only
- **Offline** Photo bytes in Dexie · create / visit / favorite enqueue · setFavorite idempotent sync
- **Ops** Health 503 no error leak · password reset locale + no prod `devResetUrl` · `/year-review` in proxy gate
- **Map parity** Measure line + radius circle on Mapbox (turf) + Google + Leaflet; Google Maps `language` from locale
- **GPX** Recorder saves to `Track` (+ download); Hebrew toasts
- **History** Location edit timeline in detail panel
- **Atlas scale** Map seed capped at 2000 (favorites first) with truncation hint; locations list cursor pages (200) + load more + honest totals
- **Settings IA** Sticky group nav: Field / Backup / Sharing / Advanced
- **Offline temp ids** Collection/trip create remaps `clientId` like locations (add/remove resolve via idMap)
- **Map bounds** Providers report `onBoundsChange` for viewport fill (heuristic fallback until first moveend)
- **Share privacy** `applyPrivacy` extracted typed module (no `any`)
- **Field analytics** `onboarding_*`, `sync_failed`/`sync_success`, map `checkin` visits via existing Plausible kit
- **Badges** Hebrew dashboard copy · night_owl / early_bird from visit hours
- **Field Mode** Sticky I’m-here · Go mode offline visit queue · sun-theme outdoor contrast
- **Security** Enforcing CSP · upload magic-byte MIME sniff + location ownership on upload
- **Dead weight** Removed unused React Query provider + deps; Follow stays schema-only (documented)
- **QA** Share privacy unit + e2e (token-gated) · Lighthouse covers share 404 + raised thresholds
- **Tracks UI** List saved GPX · show/hide polyline on map · delete · mobile entry
- **Drive restore** Inline conflict/dry-run preview (import vs skip + sample titles)
- **Field i18n** Map check-in/heatmap/tracks · dashboard sections · detail action titles · trip elevation/optimize · README uses migrate deploy
- **WhatsNew 2.1** Hebrew changelog (tracks / offline / Drive preview / badges / sun)
- **Year review** Full Hebrew UI + share title
- **Settings Hebrew** Push notifications · duplicate detector
- **Offline GPX** `save-track` sync queue action when recording offline
- **More i18n** Smart views presets · add-location tips/hazard/accessibility · notification bell · visit voice note
- **Hebrew distance/duration** Default units מ׳/ק״מ/דק׳ (en secondary) across GPS, Go mode, I’m here, tracks
- **Navigate & Share dialog** Full Hebrew · solar card + moon phases · map layers sidebar · GeoJSON · nearby now
- **Map style names** Hebrew on map switcher + settings · AQI bands · nearest parking · locations batch mode · font size · categories
- **Offline detail** Bucket toggle + delete enqueue · Log visit dialog queues offline · Undo i18n
- **Cmd-K** Surprise / import / export Hebrew · import routes to `/import`
- **Drive quick backup** Toast uses `driveBackupScopeShort` (נקודות)
- **Viewport map fill** Pan/zoom merges `fetchMapLocationsInBounds` into marker set (seed still 2000)
- **Offline mutations** Edit location + full add dialog enqueue · batch delete confirm/queue · delete removes map pin
- **Hebrew chrome** Dashboard streak/bucket · Cmd-K · vibes · Smart View dialog · dates via `formatLocalizedDate`
- **Edit parity** Tips / accessibility / hazard / vibes editable (match add form)
- **Offline organize** Collection add/remove + trip-add sync actions · localStorage entity cache · map seeds collections
- **Share honesty** Create link disabled offline with Hebrew explanation
- **Swipe visit** List-card left-swipe actually logs visit (online + offline queue)
- **Offline create** `collection-create` / `trip-create` · trip stop add/remove offline (`trip-remove`)
- **Heatmap parity** Visit-weight bubbles on Leaflet + Google; map payload includes `visitCount`
- **Share perms Hebrew** Active shares show צפייה/תגובה/עריכה · stop fallback i18n
- **Share clone locale** Clone uses `@/i18n/navigation` (keeps `/he`)
- **Invite on mobile** Collection share/invite/delete always visible on touch
- **I’m-here offline photo** Queues Dexie blob + location photo upload with visit
- **iOS PWA** Safari “Add to Home Screen” instructions after first spot
- **Trust/ops** Export helpers session-bound · `deleteComment` via deleteMany · feedback → ERROR_WEBHOOK_URL

## Deferred

- Magic-link-only auth · Neon preview branches · Full Cmd-K AI · AI NL
- Follow social graph (**schema kept dormant** — no migration; no product UI)
- Phase 1 field study is human time — use the checklist outdoors for 1–2 weeks
- Authenticated Lighthouse of `/he/app` (needs CI test credentials)

## Verify

```bash
npm test && npm run lint && npm run build && npm run check:i18n
```
