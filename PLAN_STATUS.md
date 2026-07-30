# PLAN.md — Implementation status

Updated after field-friction / growth / soft-ops roadmap (Phases 2–4).

## Shipped

- Harden v1 · Field-ready · Later polish (sun, feedback, Drive cron, Hebrew NL, share perms)
- **A** One-tap I'm here · Nearby GPS sort · Go mode ETA/auto-arrive/offline · PWA after first spot
- **B** Share mini-landing + OG · My Maps URL import + KMZ · Collection share map/clone/WhatsApp CTA
- **C** Drive restore dry-run · ERROR_WEBHOOK_URL triage · Production smoke workflow
- **Field friction** Offline sync fail/retry UI · I'm here + optional photo · Go mode GPS pause on background · Hebrew empty CTAs (add / My Maps)
- **Growth** WhatsApp-native share copy · My Maps onboarding step · Invite hiking partner (collection)
- **Soft ops** Weekly dashboard self-stats · Settings ops health hints · `docs/FIELD_CHECKLIST.md`

## Deferred

- Magic-link-only auth · Neon preview branches · Full Cmd-K · Google Maps polyline parity · AI NL
- Phase 1 field study is human time — use the checklist outdoors for 1–2 weeks

## Verify

```bash
npm test && npm run lint && npm run build
```
