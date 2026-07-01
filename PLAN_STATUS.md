# PLAN.md — סטטוס יישום

עודכן לאחר מעבר ל-`[locale]` ו-`/he/app`.

## שלב 0 — תשתית ✅

| פריט | סטטוס |
|------|--------|
| Next.js 16 + TS + Tailwind 4 | ✅ |
| next-intl + `he` default + RTL | ✅ `app/[locale]/`, `localePrefix: always` |
| messages/he + en namespaces | ✅ (8+ קבצים, ניתן להרחבה) |
| shadcn-style UI + Heebo | ✅ |
| Mobile CSS (dvh, safe-area, xs) | ✅ `globals.css` |
| BottomNav + FAB | ✅ `MobileNav`, `MapClientPage` |
| useVisualViewport | ✅ `hooks/useVisualViewport.ts` |
| Prisma + schema | ✅ |
| Prisma migrations | ⚠️ הרץ `npm run db:push` או `db:migrate` |
| NextAuth + bcrypt signup | ✅ `/he/signup` |
| `[locale]` + middleware + switcher | ✅ |
| User.locale + mapProvider | ✅ שדות ב-`User` |

## שלב 1 — מפה + מיקומים ✅ (ליבה)

| פריט | סטטוס |
|------|--------|
| 3 ספקי מפות | ✅ |
| MapShell (`/he/app`) | ✅ |
| MobileLocationSheet (Vaul) | ✅ |
| CRUD מיקומים | ✅ |
| קטגוריות, מועדפים, bucket | ✅ |
| חיפוש/סינון/מיון ברשימה | ✅ |
| תגיות UI | ⚠️ schema קיים, UI חלקי |
| MobileSearchScreen מלא | 🔜 Phase 2 |

## שלב 2 — ארגון + ביקורים ✅

| פריט | סטטוס |
|------|--------|
| אוספים + שכבות מפה | ✅ |
| Collection folders (`parentId`) | ✅ schema |
| ביקורים | ✅ |
| SmartView | ✅ schema + actions |
| תצוגת רשימה | ✅ |

## שלב 3 — כלי מפה ⚠️

| פריט | סטטוס |
|------|--------|
| לוויין/טופו | ✅ |
| מסך מלא | ✅ Mapbox |
| מיקומים בקרבתי (25km) | ✅ turf |
| MapChipBar | ✅ |
| רדיוס/מצולע draw | 🔜 Phase 2 |
| מדידת מרחק אינטראקטיבית | 🔜 Phase 2 |

## שלב 4 — שיתוף ✅

| פריט | סטטוס |
|------|--------|
| הרשאות + פרטיות + secret | ✅ |
| קישורים ציבוריים | ✅ `/he/share/[token]` |
| שיתוף אוספים/טיולים | ✅ |

## שלב 5 — ייבוא/ייצוא ✅ (ליבה)

| פריט | סטטוס |
|------|--------|
| GeoJSON, GPX, KML, CSV | ✅ |
| דף `/he/import` | ✅ |
| ייצוא GeoJSON/GPX | ✅ |
| זיהוי כפילויות | 🔜 Phase 2 |
| KML/CSV export | 🔜 Phase 2 |

## שלב 6 — מתכנן טיולים ✅ (ליבה)

| פריט | סטטוס |
|------|--------|
| טיולים + תחנות | ✅ `/he/trips/[id]` |
| TSP / routing APIs | 🔜 Phase 2 |
| ויזואליזציית מסלול | 🔜 Phase 2 |

## שלב 7 — PWA + Offline ⚠️

| פריט | סטטוס |
|------|--------|
| manifest עברי | ✅ `start_url: /he/app` |
| Dexie cache | ✅ `lib/offline/db.ts` |
| Offline banner | ✅ |
| Serwist service worker | 🔜 דורש הגדרת build נפרדת |
| מצלמה native | 🔜 Phase 2 |

## שלב 8 — ליטוש 🔜

| פריט | סטטוס |
|------|--------|
| לוח בקרה | ✅ בסיסי |
| אונבורדינג | ✅ 3 שלבים |
| חיפוש NL עברית | 🔜 Phase 2 |
| תרגום מלא לכל הקומפוננטות | ⚠️ בתהליך |
| Playwright 320px RTL | ✅ config + smoke test |
| Lighthouse ≥ 90 | 🔜 CI |

## ניווט

- מפה ראשית: **`/he/app`** (אנגלית: `/en/app`)
- הפניות אוטומטיות: `/map` → `/he/app`
- שפה: `LocaleSwitcher` + `User.locale`

## פקודות

```bash
npm run db:push      # עדכון סכמה
npm run dev          # פיתוח
npm run build        # build
npx playwright test  # בדיקות E2E
```
