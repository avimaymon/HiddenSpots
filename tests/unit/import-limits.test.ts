import { describe, expect, it } from "vitest";
import { IMPORT_LOCATIONS_MAX } from "@/lib/import/limits";

describe("import limits", () => {
  it("caps at 500 per request", () => {
    expect(IMPORT_LOCATIONS_MAX).toBe(500);
    const received = 1200;
    const truncated = received > IMPORT_LOCATIONS_MAX;
    const processed = truncated ? IMPORT_LOCATIONS_MAX : received;
    expect(truncated).toBe(true);
    expect(processed).toBe(500);
  });
});
