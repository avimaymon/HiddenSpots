import { describe, expect, it } from "vitest";
import { payloadReferencesClientId } from "@/lib/offline/id-map";

describe("drop sync matching — payloadReferencesClientId", () => {
  it("matches create and entity-id payloads", () => {
    expect(payloadReferencesClientId({ clientId: "tmp" }, "tmp")).toBe(true);
    expect(payloadReferencesClientId({ tripId: "tmp" }, "tmp")).toBe(true);
    expect(payloadReferencesClientId({ collectionId: "tmp" }, "tmp")).toBe(true);
    expect(payloadReferencesClientId({ locationId: "tmp" }, "tmp")).toBe(true);
    expect(payloadReferencesClientId({ tripId: "other" }, "tmp")).toBe(false);
  });
});
