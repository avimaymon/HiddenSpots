import { describe, expect, it } from "vitest";
import { spotsNearTrack } from "@/lib/geo/track-stats";

describe("spotsNearTrack", () => {
  const track = [
    { lat: 32.0, lng: 34.8 },
    { lat: 32.001, lng: 34.8 },
    { lat: 32.002, lng: 34.8 },
  ];

  it("returns nearby unvisited spots first", () => {
    const spots = [
      {
        id: "far",
        title: "Far",
        latitude: 33,
        longitude: 35,
        isVisited: false,
      },
      {
        id: "near-visited",
        title: "Near visited",
        latitude: 32.0005,
        longitude: 34.8,
        isVisited: true,
      },
      {
        id: "near-new",
        title: "Near new",
        latitude: 32.0012,
        longitude: 34.8,
        isVisited: false,
      },
    ];
    const hits = spotsNearTrack(spots, track, { radiusKm: 0.5, limit: 5 });
    expect(hits.map((h) => h.id)).toEqual(["near-new", "near-visited"]);
  });

  it("returns empty for empty track", () => {
    expect(spotsNearTrack([{ id: "a", title: "A", latitude: 0, longitude: 0, isVisited: false }], [])).toEqual(
      []
    );
  });
});
