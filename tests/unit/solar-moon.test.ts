import { describe, expect, it } from "vitest";
import { moonPhaseKey } from "@/lib/geo/solar";

describe("moonPhaseKey", () => {
  it("maps new and full moons", () => {
    expect(moonPhaseKey(0).key).toBe("new");
    expect(moonPhaseKey(0.5).key).toBe("full");
  });

  it("maps crescent / gibbous bands", () => {
    expect(moonPhaseKey(0.1).key).toBe("waxingCrescent");
    expect(moonPhaseKey(0.4).key).toBe("waxingGibbous");
    expect(moonPhaseKey(0.9).key).toBe("waningCrescent");
  });
});
