import { describe, it, expect } from "vitest";
import {
  parseBackup,
  BackupTooLargeError,
  BackupUnreadableError,
  BACKUP_MAX_BYTES,
  RESTORE_FEATURES_MAX,
  RESTORE_TAGS_PER_FEATURE_MAX,
} from "@/lib/drive/backup-schema";

const feature = (props: Record<string, unknown> = {}, coords: unknown = [34.78, 32.07]) => ({
  geometry: { coordinates: coords },
  properties: props,
});

const file = (features: unknown[]) =>
  JSON.stringify({ version: 1, locations: { features } });

describe("backup parsing", () => {
  it("accepts a well-formed feature and reads GeoJSON coordinate order", () => {
    const { features } = parseBackup(file([feature({ name: "מעיין" })]));
    expect(features).toHaveLength(1);
    // [longitude, latitude] — reversing these silently relocates every spot.
    expect(features[0]).toMatchObject({
      longitude: 34.78,
      latitude: 32.07,
      title: "מעיין",
      privacy: "PRIVATE",
    });
  });

  it("rejects non-finite and out-of-range coordinates instead of writing them", () => {
    // The original code destructured these straight into a Float column, so a
    // hand-edited file produced rows no map could render and no UI could fix.
    const bad = [
      feature({}, ["34.78", "32.07"]),
      feature({}, [null, 32.07]),
      feature({}, [34.78]),
      feature({}, [200, 32.07]),
      feature({}, [34.78, 91]),
      feature({}, []),
    ];
    const { features, rejected } = parseBackup(file(bad));
    expect(features).toHaveLength(0);
    expect(rejected).toBe(bad.length);
  });

  it("keeps the good features when one is corrupt", () => {
    const { features, rejected } = parseBackup(
      file([feature({ name: "Good" }), feature({}, [999, 999]), feature({ name: "Also good" })])
    );
    expect(features.map((f) => f.title)).toEqual(["Good", "Also good"]);
    expect(rejected).toBe(1);
  });

  it("falls back to a default title rather than dropping an unnamed spot", () => {
    const { features } = parseBackup(file([feature({})]));
    expect(features[0]?.title).toBe("Restored Location");
  });

  it("ignores an unknown privacy value instead of trusting it", () => {
    const { features, rejected } = parseBackup(
      file([feature({ name: "x", "hs:privacy": "ADMIN" })])
    );
    expect(features).toHaveLength(0);
    expect(rejected).toBe(1);
  });

  it("caps the number of features and says so", () => {
    const many = Array.from({ length: RESTORE_FEATURES_MAX + 10 }, (_, i) =>
      feature({ name: `s${i}` })
    );
    const { features, total, truncated } = parseBackup(file(many));
    expect(features).toHaveLength(RESTORE_FEATURES_MAX);
    expect(total).toBe(RESTORE_FEATURES_MAX + 10);
    expect(truncated).toBe(true);
  });

  it("deduplicates and caps tags", () => {
    const tags = ["a", "a", " a ", ...Array.from({ length: 80 }, (_, i) => `t${i}`)];
    const { features } = parseBackup(file([feature({ name: "x", "hs:tags": tags })]));
    const out = features[0]!.tags;
    expect(out.length).toBeLessThanOrEqual(RESTORE_TAGS_PER_FEATURE_MAX);
    expect(new Set(out).size).toBe(out.length);
  });

  it("refuses a file past the byte ceiling before parsing it", () => {
    const huge = "x".repeat(BACKUP_MAX_BYTES + 1);
    expect(() => parseBackup(huge)).toThrow(BackupTooLargeError);
  });

  it("reports unreadable rather than throwing a raw SyntaxError", () => {
    expect(() => parseBackup("{not json")).toThrow(BackupUnreadableError);
    expect(() => parseBackup(JSON.stringify({ locations: { features: "nope" } }))).toThrow(
      BackupUnreadableError
    );
  });

  it("treats a backup with no locations as empty, not an error", () => {
    expect(parseBackup(JSON.stringify({ version: 1 })).features).toEqual([]);
  });
});
