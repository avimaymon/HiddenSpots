import { describe, it, expect } from "vitest";
import { bboxFromViewState } from "@/lib/map/viewport";

describe("bboxFromViewState", () => {
  it("grows as zoom decreases", () => {
    const tight = bboxFromViewState({ latitude: 32.1, longitude: 34.8, zoom: 14 });
    const wide = bboxFromViewState({ latitude: 32.1, longitude: 34.8, zoom: 8 });
    expect(wide.east - wide.west).toBeGreaterThan(tight.east - tight.west);
    expect(wide.north - wide.south).toBeGreaterThan(tight.north - tight.south);
  });

  it("centers on the view", () => {
    const b = bboxFromViewState({ latitude: 31.5, longitude: 35.0, zoom: 12 });
    expect(b.south).toBeLessThan(31.5);
    expect(b.north).toBeGreaterThan(31.5);
    expect(b.west).toBeLessThan(35.0);
    expect(b.east).toBeGreaterThan(35.0);
  });
});
