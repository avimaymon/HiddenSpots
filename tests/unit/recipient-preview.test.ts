import { describe, expect, it } from "vitest";
import { buildShareRecipientPreview } from "@/lib/shares/recipient-preview";

describe("buildShareRecipientPreview", () => {
  it("never exposes private notes", () => {
    const p = buildShareRecipientPreview({
      permission: "EDIT",
      privacy: "PRIVATE",
      hasDescription: true,
      hasPhotos: true,
    });
    expect(p.showsPrivateNotes).toBe(false);
    expect(p.permissionNote).toBe("edit");
    expect(p.showsExactCoords).toBe(true);
  });

  it("marks secret as fuzzy coords", () => {
    const p = buildShareRecipientPreview({
      permission: "VIEW",
      privacy: "SECRET",
    });
    expect(p.secretFuzz).toBe(true);
    expect(p.showsExactCoords).toBe(false);
    expect(p.showsAddress).toBe(false);
  });
});
