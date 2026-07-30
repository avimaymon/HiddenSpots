export const SYSTEM_CATEGORIES = [
  { name: "Spring", nameHe: "מעיין", icon: "droplets", color: "#06b6d4" },
  { name: "Waterfall", nameHe: "מפל מים", icon: "waves", color: "#3b82f6" },
  { name: "Viewpoint", nameHe: "תצפית", icon: "eye", color: "#8b5cf6" },
  { name: "Hiking Trail", nameHe: "שביל הליכה", icon: "footprints", color: "#22c55e" },
  { name: "Beach", nameHe: "חוף", icon: "umbrella", color: "#f59e0b" },
  { name: "Picnic Area", nameHe: "פיקניק", icon: "trees", color: "#84cc16" },
  { name: "Camping Site", nameHe: "קמפינג", icon: "tent", color: "#f97316" },
  { name: "Bike Trail", nameHe: "שביל אופניים", icon: "bike", color: "#ec4899" },
  { name: "Photography Spot", nameHe: "נקודת צילום", icon: "camera", color: "#a855f7" },
  { name: "Fishing Spot", nameHe: "דייג", icon: "fish", color: "#0891b2" },
  { name: "Sunrise", nameHe: "זריחה", icon: "sunrise", color: "#fb923c" },
  { name: "Sunset", nameHe: "שקיעה", icon: "sunset", color: "#f43f5e" },
  { name: "Hidden Gem", nameHe: "מקום נסתר", icon: "gem", color: "#14b8a6" },
  { name: "Other", nameHe: "אחר", icon: "map-pin", color: "#6b7280" },
] as const;

export async function seedSystemCategories(
  prisma: { category: { createMany: (args: {
    data: Array<{
      name: string;
      nameHe: string;
      icon: string;
      color: string;
      userId: string;
      isSystem: boolean;
    }>;
    skipDuplicates?: boolean;
  }) => Promise<unknown> } },
  userId: string
) {
  await prisma.category.createMany({
    data: SYSTEM_CATEGORIES.map((c) => ({ ...c, userId, isSystem: true })),
    skipDuplicates: true,
  });
}
