import { describe, it, expect } from "vitest";
import { parseImportFile } from "@/lib/geo/import";

const csv = (body: string) =>
  new File([body], "spots.csv", { type: "text/csv" });

const HEADER = "name,latitude,longitude";

async function parse(body: string) {
  return parseImportFile(csv(`${HEADER}\n${body}`));
}

describe("CSV import", () => {
  it("reads a well-formed file", async () => {
    const r = await parse("Ein Gedi,31.46,35.39");
    expect(r.count).toBe(1);
    expect(r.locations[0]).toMatchObject({
      title: "Ein Gedi",
      latitude: 31.46,
      longitude: 35.39,
    });
    expect(r.errors).toEqual([]);
  });

  it("skips a row with fewer columns than the header, and says which", async () => {
    // Ragged rows are the norm in hand-edited CSV. These used to become
    // parseFloat(undefined) === NaN, survive the import action's `== null`
    // guard, and surface to the user as a raw ZodError.
    const r = await parse("Ein Gedi,31.46,35.39\nTruncated row");

    expect(r.count).toBe(1);
    expect(r.locations.every((l) => Number.isFinite(l.latitude))).toBe(true);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain("Row 3");
  });

  it("skips non-numeric coordinates", async () => {
    const r = await parse("Bad,not-a-number,35.39\nAlsoBad,31.46,\nGood,31.5,35.4");
    expect(r.count).toBe(1);
    expect(r.locations[0]).toMatchObject({ title: "Good" });
    expect(r.errors).toHaveLength(2);
  });

  it("never emits NaN coordinates", async () => {
    const r = await parse("A,,\nB,x,y\nC,31.4,35.3");
    for (const loc of r.locations) {
      expect(Number.isFinite(loc.latitude)).toBe(true);
      expect(Number.isFinite(loc.longitude)).toBe(true);
    }
  });

  it("numbers rows as the user sees them in the file", async () => {
    // Line 1 is the header, so the first data row is line 2.
    const r = await parse("broken");
    expect(r.errors[0]).toContain("Row 2");
  });

  it("falls back to a default title rather than an empty one", async () => {
    const r = await parse(",31.46,35.39");
    expect(r.locations[0]?.title).toBe("CSV Location");
  });

  it("still reports a file with no coordinate columns", async () => {
    const r = await parseImportFile(csv("name,notes\nEin Gedi,nice"));
    expect(r.count).toBe(0);
    expect(r.errors[0]).toMatch(/latitude|longitude/i);
  });
});
