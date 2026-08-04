export type Badge = {
  id: string;
  emoji: string;
  /** i18n key under dashboard.badges.* */
  nameKey: string;
  descriptionKey: string;
};

export const ALL_BADGES: Badge[] = [
  { id: "first_spot", emoji: "📍", nameKey: "first_spot", descriptionKey: "first_spot_desc" },
  { id: "5_spots", emoji: "🗺️", nameKey: "five_spots", descriptionKey: "five_spots_desc" },
  { id: "25_spots", emoji: "🧭", nameKey: "twentyfive_spots", descriptionKey: "twentyfive_spots_desc" },
  { id: "100_spots", emoji: "🏅", nameKey: "hundred_spots", descriptionKey: "hundred_spots_desc" },
  { id: "first_visit", emoji: "👣", nameKey: "first_visit", descriptionKey: "first_visit_desc" },
  { id: "10_visits", emoji: "🔭", nameKey: "ten_visits", descriptionKey: "ten_visits_desc" },
  { id: "50_visits", emoji: "🌍", nameKey: "fifty_visits", descriptionKey: "fifty_visits_desc" },
  { id: "night_owl", emoji: "🦉", nameKey: "night_owl", descriptionKey: "night_owl_desc" },
  { id: "early_bird", emoji: "🌅", nameKey: "early_bird", descriptionKey: "early_bird_desc" },
  { id: "all_seasons", emoji: "🌡️", nameKey: "all_seasons", descriptionKey: "all_seasons_desc" },
  { id: "trip_started", emoji: "🚗", nameKey: "trip_started", descriptionKey: "trip_started_desc" },
  { id: "bucket_10", emoji: "✅", nameKey: "bucket_10", descriptionKey: "bucket_10_desc" },
];

export function computeBadges(stats: {
  totalLocations: number;
  totalVisits: number;
  bucketListVisited: number;
  hasTrips: boolean;
  allSeasonsCovered: boolean;
  hasNightVisit?: boolean;
  hasEarlyVisit?: boolean;
}): string[] {
  const earned: string[] = [];
  if (stats.totalLocations >= 1) earned.push("first_spot");
  if (stats.totalLocations >= 5) earned.push("5_spots");
  if (stats.totalLocations >= 25) earned.push("25_spots");
  if (stats.totalLocations >= 100) earned.push("100_spots");
  if (stats.totalVisits >= 1) earned.push("first_visit");
  if (stats.totalVisits >= 10) earned.push("10_visits");
  if (stats.totalVisits >= 50) earned.push("50_visits");
  if (stats.hasNightVisit) earned.push("night_owl");
  if (stats.hasEarlyVisit) earned.push("early_bird");
  if (stats.hasTrips) earned.push("trip_started");
  if (stats.bucketListVisited >= 10) earned.push("bucket_10");
  if (stats.allSeasonsCovered) earned.push("all_seasons");
  return earned;
}

/** Weekly visit streak from newest→oldest timestamps. */
export function computeStreak(visits: { visitedAt: Date }[]): number {
  if (!visits.length) return 0;
  const weekStart = (d: Date) => {
    const t = new Date(d);
    t.setDate(t.getDate() - t.getDay());
    t.setHours(0, 0, 0, 0);
    return t.getTime();
  };
  const weeks = [...new Set(visits.map((v) => weekStart(v.visitedAt)))].sort((a, b) => b - a);
  let streak = 1;
  for (let i = 1; i < weeks.length; i++) {
    if (weeks[i - 1] - weeks[i] === 7 * 24 * 60 * 60 * 1000) streak++;
    else break;
  }
  return streak;
}

/** Local hour of visit — night owl after 21:00, early bird before 07:00 */
export function visitHourFlags(visitedAtDates: Date[]): {
  hasNightVisit: boolean;
  hasEarlyVisit: boolean;
} {
  let hasNightVisit = false;
  let hasEarlyVisit = false;
  for (const d of visitedAtDates) {
    const h = d.getHours();
    if (h >= 21) hasNightVisit = true;
    if (h < 7) hasEarlyVisit = true;
    if (hasNightVisit && hasEarlyVisit) break;
  }
  return { hasNightVisit, hasEarlyVisit };
}
