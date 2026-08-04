import { describe, expect, it } from "vitest";
import {
  parseHebrewQuery,
  matchLocationAgainstNl,
  hasNlFilters,
} from "@/lib/search/hebrew-nl";

describe("parseHebrewQuery", () => {
  it("maps dog-friendly waterfalls", () => {
    const f = parseHebrewQuery("מפלים ידידותיים לכלבים");
    expect(f.categoryNameEn).toBe("Waterfall");
    expect(f.isDogFriendly).toBe(true);
    expect(hasNlFilters(f)).toBe(true);
  });

  it("maps unvisited nearby", () => {
    const f = parseHebrewQuery("מקומות שלא ביקרתי לידי");
    expect(f.isVisited).toBe(false);
    expect(f.nearby).toBe(true);
  });

  it("maps favorites + beach", () => {
    const f = parseHebrewQuery("חופים מועדפים");
    expect(f.categoryNameEn).toBe("Beach");
    expect(f.isFavorite).toBe(true);
  });

  it("keeps leftover text for title search", () => {
    const f = parseHebrewQuery("מפל בנחל");
    expect(f.categoryNameEn).toBe("Waterfall");
    expect(f.text).toContain("בנחל");
  });

  it("returns empty for blank", () => {
    expect(parseHebrewQuery("   ").matched).toEqual([]);
  });

  it("maps Negev region with waterfalls", () => {
    const f = parseHebrewQuery("מפלים בנגב");
    expect(f.categoryNameEn).toBe("Waterfall");
    expect(f.regionLabel).toBe("נגב");
    expect(f.region?.minLat).toBeLessThan(31);
  });
});

describe("matchLocationAgainstNl", () => {
  const waterfall = {
    title: "עין גדי",
    description: null,
    isFavorite: false,
    isVisited: false,
    isDogFriendly: true,
    category: { name: "Waterfall", nameHe: "מפל מים" },
    tags: [],
  };

  it("matches dog-friendly waterfall", () => {
    const f = parseHebrewQuery("מפלים לכלבים");
    expect(matchLocationAgainstNl(waterfall, f)).toBe(true);
  });

  it("rejects non-dog-friendly", () => {
    const f = parseHebrewQuery("מפלים לכלבים");
    expect(matchLocationAgainstNl({ ...waterfall, isDogFriendly: false }, f)).toBe(false);
  });

  it("filters by region bbox", () => {
    const f = parseHebrewQuery("בנגב");
    expect(
      matchLocationAgainstNl(
        { ...waterfall, title: "עין עבדת", latitude: 30.8, longitude: 34.8 },
        f
      )
    ).toBe(true);
    expect(
      matchLocationAgainstNl(
        { ...waterfall, title: " Hermon", latitude: 33.3, longitude: 35.8 },
        f
      )
    ).toBe(false);
  });
});
