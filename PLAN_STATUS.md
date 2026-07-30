# PLAN.md — Implementation status (Now / Next / Later)

Updated after high-ROI roadmap ship (Phases 0–3).

## Now — Harden v1 — Done

Credentials category seed · Leaflet default without paid keys · Offline sync `update` + LWW · SW `/api` + OSM · Trip remove stop · Trash/restore · Rich visits · Share expiry/revoke/native · Rate limit · Password reset · Privacy/Terms · Tags filter · CI lint+test · EXIF strip SECRET · migrate deploy · Client error boundary + `/api/client-error` · Account linking (`allowDangerousEmailAccountLinking`)

## Next — Field-ready — Done

GPS FAB long-press · MobileSearch · PWA install · VisitPhoto+camera in LogVisitDialog · Landing · Print trip + print CSS · Leaflet offline tiles · Landscape-narrow CSS · Stronger reduced-motion · KML/CSV · Import dupes · Create-time dup warn · Playwright 320px config

## Later — Done

Measure + radius · Collection folders (UI) · Trip polyline (Mapbox + Leaflet) · Print · Landing · Weather autofill · Create from photo EXIF · Account linking · Sun / high-contrast mode · In-app feedback · Scheduled Drive backup (cron) · Hebrew NL search (keyword dictionary) · Collaborative COMMENT/EDIT enforcement

## Explicitly deferred (still out of scope)

- Magic-link-only auth (Resend magic)
- Neon preview DB branches
- Full Cmd-K shortcut surface
- Google Maps trip polyline parity (Leaflet+Mapbox covered)
- AI-backed NL search (dictionary covers v1)

## Verify

```bash
npm test && npm run lint && npm run build
```
