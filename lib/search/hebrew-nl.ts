/**
 * Keyword → filter dictionary for Hebrew (and light English) NL search.
 * No AI — maps phrases onto the existing location filter fields.
 */

export type NlRegionBBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export type NlSearchFilters = {
  /** Free-text remainder after keywords are stripped */
  text: string;
  categoryNameEn?: string;
  categoryNameHe?: string;
  isFavorite?: boolean;
  isBucketList?: boolean;
  isVisited?: boolean;
  isDogFriendly?: boolean;
  isFamilyFriendly?: boolean;
  isCampingAllowed?: boolean;
  hasParking?: boolean;
  hasWater?: boolean;
  hasShade?: boolean;
  /** Request GPS-based nearby search (client applies radius) */
  nearby?: boolean;
  /** Israeli region approximate bbox */
  region?: NlRegionBBox;
  regionLabel?: string;
  /** Matched keyword labels for UI chips */
  matched: string[];
};

type Rule = {
  patterns: RegExp[];
  apply: (f: NlSearchFilters) => void;
  label: string;
};

const CATEGORY_RULES: Array<{ patterns: RegExp[]; en: string; he: string; label: string }> = [
  { patterns: [/מפל(?:ים|י)?/, /waterfall/i], en: "Waterfall", he: "מפל מים", label: "מפל" },
  { patterns: [/מעיינ(?:ות|ים)?/, /spring/i], en: "Spring", he: "מעיין", label: "מעיין" },
  { patterns: [/תצפית(?:ות)?/, /viewpoint/i], en: "Viewpoint", he: "תצפית", label: "תצפית" },
  { patterns: [/שביל(?:י)?\s*הליכה/, /טיול(?:ים)?/, /hiking/i], en: "Hiking Trail", he: "שביל הליכה", label: "שביל" },
  { patterns: [/חופ(?:ים|ות|ש)?/, /beach/i], en: "Beach", he: "חוף", label: "חוף" },
  { patterns: [/פיקניק/, /picnic/i], en: "Picnic Area", he: "פיקניק", label: "פיקניק" },
  { patterns: [/קמפינג/, /camping/i], en: "Camping Site", he: "קמפינג", label: "קמפינג" },
  { patterns: [/אופניים/, /bike/i], en: "Bike Trail", he: "שביל אופניים", label: "אופניים" },
  { patterns: [/צילום/, /photo(?:graphy)?/i], en: "Photography Spot", he: "נקודת צילום", label: "צילום" },
  { patterns: [/דיי?ג/, /fish(?:ing)?/i], en: "Fishing Spot", he: "דייג", label: "דייג" },
  { patterns: [/זריחה/, /sunrise/i], en: "Sunrise", he: "זריחה", label: "זריחה" },
  { patterns: [/שקיעה/, /sunset/i], en: "Sunset", he: "שקיעה", label: "שקיעה" },
  { patterns: [/נסתר(?:ים|ות)?/, /פנינ(?:ה|ות)/, /hidden\s*gem/i], en: "Hidden Gem", he: "מקום נסתר", label: "נסתר" },
];

const FLAG_RULES: Rule[] = [
  {
    patterns: [/ידידותי(?:ים|ות)?\s*לכלב(?:ים)?/, /לכלב(?:ים)?/, /כלב(?:ים)?/, /dog[- ]?friendly/i],
    apply: (f) => {
      f.isDogFriendly = true;
    },
    label: "כלבים",
  },
  {
    patterns: [/ידידותי(?:ים|ות)?\s*למשפח(?:ה|ות)/, /למשפח(?:ה|ות)/, /משפח(?:ה|ות)/, /family[- ]?friendly/i],
    apply: (f) => {
      f.isFamilyFriendly = true;
    },
    label: "משפחה",
  },
  {
    patterns: [/מותר\s*קמפינג/, /camping\s*allowed/i],
    apply: (f) => {
      f.isCampingAllowed = true;
    },
    label: "קמפינג מותר",
  },
  {
    patterns: [/חניה/, /parking/i],
    apply: (f) => {
      f.hasParking = true;
    },
    label: "חניה",
  },
  {
    // Avoid matching the letters inside מפלים / מעיין
    patterns: [/(?:^|[\s,])מים(?:$|[\s,])/, /\bwater\b/i],
    apply: (f) => {
      f.hasWater = true;
    },
    label: "מים",
  },
  {
    patterns: [/(?:^|[\s,])צל(?:$|[\s,])/, /\bshade\b/i],
    apply: (f) => {
      f.hasShade = true;
    },
    label: "צל",
  },
  {
    patterns: [/מועדפ(?:ים|ות)?/, /favorite/i],
    apply: (f) => {
      f.isFavorite = true;
    },
    label: "מועדפים",
  },
  {
    patterns: [/רשימת\s*משאלות/, /דלי/, /bucket\s*list/i],
    apply: (f) => {
      f.isBucketList = true;
    },
    label: "רשימת משאלות",
  },
  {
    patterns: [/לא\s*ביקרתי/, /שלא\s*ביקרתי/, /עוד\s*לא\s*ביקר/, /unvisited/i, /not\s*visited/i],
    apply: (f) => {
      f.isVisited = false;
    },
    label: "לא ביקרתי",
  },
  {
    patterns: [/ביקרתי/, /visited/i],
    apply: (f) => {
      if (f.isVisited === undefined) f.isVisited = true;
    },
    label: "ביקרתי",
  },
  {
    patterns: [/לידי(?:י)?/, /בקרבתי/, /קרוב(?:ים)?/, /nearby/i, /near\s*me/i],
    apply: (f) => {
      f.nearby = true;
    },
    label: "לידי",
  },
];

/** Approximate Israel region boxes for dictionary NL (not cadastral). */
const REGION_RULES: Array<{
  patterns: RegExp[];
  label: string;
  bbox: NlRegionBBox;
}> = [
  {
    patterns: [/ב?גולן/, /golan/i],
    label: "גולן",
    bbox: { minLat: 32.7, maxLat: 33.35, minLng: 35.55, maxLng: 35.95 },
  },
  {
    patterns: [/ב?גליל/, /galilee/i],
    label: "גליל",
    bbox: { minLat: 32.65, maxLat: 33.3, minLng: 35.0, maxLng: 35.65 },
  },
  {
    patterns: [/כרמל/, /חיפה/, /carmel/i, /haifa/i],
    label: "כרמל",
    bbox: { minLat: 32.55, maxLat: 32.95, minLng: 34.85, maxLng: 35.15 },
  },
  {
    patterns: [/שרון/, /sharon/i],
    label: "שרון",
    bbox: { minLat: 32.1, maxLat: 32.55, minLng: 34.75, maxLng: 35.05 },
  },
  {
    patterns: [/מרכז/, /גוש\s*דן/, /center/i],
    label: "מרכז",
    bbox: { minLat: 31.85, maxLat: 32.25, minLng: 34.7, maxLng: 35.1 },
  },
  {
    patterns: [/ירושל(?:ים)?/, /יהודה/, /jerusalem/i],
    label: "ירושלים",
    bbox: { minLat: 31.55, maxLat: 31.95, minLng: 34.95, maxLng: 35.4 },
  },
  {
    patterns: [/ים\s*המלח/, /מדבר\s*יהודה/, /dead\s*sea/i],
    label: "ים המלח",
    bbox: { minLat: 31.0, maxLat: 31.85, minLng: 35.25, maxLng: 35.6 },
  },
  {
    patterns: [/ב?נגב/, /negev/i],
    label: "נגב",
    bbox: { minLat: 29.5, maxLat: 31.5, minLng: 34.4, maxLng: 35.35 },
  },
  {
    patterns: [/אילת/, /ערבה/, /eilat/i],
    label: "אילת",
    bbox: { minLat: 29.4, maxLat: 30.6, minLng: 34.8, maxLng: 35.25 },
  },
];

/** Strip matched spans from the query so leftover text can still title-search. */
function stripPatterns(text: string, patterns: RegExp[]): string {
  let out = text;
  for (const p of patterns) {
    out = out.replace(p, " ");
  }
  return out.replace(/\s+/g, " ").trim();
}

export function parseHebrewQuery(raw: string): NlSearchFilters {
  const result: NlSearchFilters = { text: "", matched: [] };
  if (!raw.trim()) return result;

  let remaining = raw.trim();

  for (const cat of CATEGORY_RULES) {
    if (cat.patterns.some((p) => p.test(remaining))) {
      result.categoryNameEn = cat.en;
      result.categoryNameHe = cat.he;
      result.matched.push(cat.label);
      remaining = stripPatterns(remaining, cat.patterns);
      break;
    }
  }

  for (const rule of FLAG_RULES) {
    if (rule.patterns.some((p) => p.test(remaining))) {
      rule.apply(result);
      result.matched.push(rule.label);
      remaining = stripPatterns(remaining, rule.patterns);
    }
  }

  for (const region of REGION_RULES) {
    if (region.patterns.some((p) => p.test(remaining))) {
      result.region = region.bbox;
      result.regionLabel = region.label;
      result.matched.push(region.label);
      remaining = stripPatterns(remaining, region.patterns);
      break;
    }
  }

  // Drop filler Hebrew/English words / lone clitics that only exist for grammar
  remaining = remaining
    .replace(/\b(?:עם|של|את|או|the|a|an|with|for|and|or|to|of)\b/gi, " ")
    .replace(/(?:^|\s)[בלמשהוכ](?:\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  result.text = remaining;
  return result;
}

export function hasNlFilters(f: NlSearchFilters): boolean {
  return (
    f.matched.length > 0 ||
    Boolean(
      f.categoryNameEn ||
        f.isFavorite !== undefined ||
        f.isBucketList !== undefined ||
        f.isVisited !== undefined ||
        f.isDogFriendly ||
        f.isFamilyFriendly ||
        f.isCampingAllowed ||
        f.hasParking ||
        f.hasWater ||
        f.hasShade ||
        f.nearby ||
        f.region
    )
  );
}

/** Client-side filter of a location row against NL parse result. */
export function matchLocationAgainstNl<
  T extends {
    title: string;
    description?: string | null;
    latitude?: number;
    longitude?: number;
    isFavorite?: boolean;
    isBucketList?: boolean;
    isVisited?: boolean;
    isDogFriendly?: boolean | null;
    isFamilyFriendly?: boolean | null;
    isCampingAllowed?: boolean | null;
    hasParking?: boolean | null;
    hasWater?: boolean | null;
    hasShade?: boolean | null;
    category?: { name: string; nameHe?: string | null } | null;
    tags?: { tag: { name: string } }[];
  },
>(loc: T, f: NlSearchFilters): boolean {
  if (f.categoryNameEn || f.categoryNameHe) {
    const name = loc.category?.name ?? "";
    const nameHe = loc.category?.nameHe ?? "";
    if (name !== f.categoryNameEn && nameHe !== f.categoryNameHe) return false;
  }
  if (f.isFavorite === true && !loc.isFavorite) return false;
  if (f.isBucketList === true && !loc.isBucketList) return false;
  if (f.isVisited === true && !loc.isVisited) return false;
  if (f.isVisited === false && loc.isVisited) return false;
  if (f.isDogFriendly && !loc.isDogFriendly) return false;
  if (f.isFamilyFriendly && !loc.isFamilyFriendly) return false;
  if (f.isCampingAllowed && !loc.isCampingAllowed) return false;
  if (f.hasParking && !loc.hasParking) return false;
  if (f.hasWater && !loc.hasWater) return false;
  if (f.hasShade && !loc.hasShade) return false;
  if (f.region) {
    const lat = loc.latitude;
    const lng = loc.longitude;
    if (lat == null || lng == null) return false;
    if (
      lat < f.region.minLat ||
      lat > f.region.maxLat ||
      lng < f.region.minLng ||
      lng > f.region.maxLng
    ) {
      return false;
    }
  }

  if (f.text) {
    const q = f.text.toLowerCase();
    const hay = [
      loc.title,
      loc.description ?? "",
      ...(loc.tags?.map((t) => t.tag.name) ?? []),
    ]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }

  return true;
}
