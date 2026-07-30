export type Badge = {
  id: string;
  emoji: string;
  name: string;
  description: string;
};

export const ALL_BADGES: Badge[] = [
  { id: "first_spot", emoji: "📍", name: "Trailblazer", description: "Add your first spot" },
  { id: "5_spots", emoji: "🗺️", name: "Explorer", description: "Add 5 spots" },
  { id: "25_spots", emoji: "🧭", name: "Cartographer", description: "Add 25 spots" },
  { id: "100_spots", emoji: "🏅", name: "Atlas Maker", description: "Add 100 spots" },
  { id: "first_visit", emoji: "👣", name: "First Steps", description: "Log your first visit" },
  { id: "10_visits", emoji: "🔭", name: "Frequent Visitor", description: "Log 10 visits" },
  { id: "50_visits", emoji: "🌍", name: "Adventurer", description: "Log 50 visits" },
  { id: "night_owl", emoji: "🦉", name: "Night Owl", description: "Log a visit after 9pm" },
  { id: "early_bird", emoji: "🌅", name: "Early Bird", description: "Log a visit before 7am" },
  { id: "all_seasons", emoji: "🌡️", name: "Four Seasons", description: "Add spots for all 4 seasons" },
  { id: "trip_started", emoji: "🚗", name: "Road Tripper", description: "Create your first trip" },
  { id: "bucket_10", emoji: "✅", name: "Bucket Crusher", description: "Visit 10 bucket list spots" },
];

export function computeBadges(stats: {
  totalLocations: number;
  totalVisits: number;
  bucketListVisited: number;
  hasTrips: boolean;
  allSeasonsCovered: boolean;
}): string[] {
  const earned: string[] = [];
  if (stats.totalLocations >= 1) earned.push("first_spot");
  if (stats.totalLocations >= 5) earned.push("5_spots");
  if (stats.totalLocations >= 25) earned.push("25_spots");
  if (stats.totalLocations >= 100) earned.push("100_spots");
  if (stats.totalVisits >= 1) earned.push("first_visit");
  if (stats.totalVisits >= 10) earned.push("10_visits");
  if (stats.totalVisits >= 50) earned.push("50_visits");
  if (stats.hasTrips) earned.push("trip_started");
  if (stats.bucketListVisited >= 10) earned.push("bucket_10");
  if (stats.allSeasonsCovered) earned.push("all_seasons");
  return earned;
}
