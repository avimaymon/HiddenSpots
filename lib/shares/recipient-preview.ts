/**
 * Honest pre-create summary of what share recipients will see.
 * Mirrors public DTO rules without needing a server round-trip.
 */

export type ShareRecipientPreview = {
  showsTitle: boolean;
  showsDescription: boolean;
  showsExactCoords: boolean;
  showsAddress: boolean;
  showsPrivateNotes: boolean;
  showsPhotos: boolean;
  permissionNote: "view" | "comment" | "edit";
  secretFuzz: boolean;
};

export function buildShareRecipientPreview(input: {
  permission: "VIEW" | "COMMENT" | "EDIT" | "MANAGE";
  privacy?: "PRIVATE" | "SHARED" | "PUBLIC" | "SECRET" | string | null;
  fuzzyCoordinates?: boolean | null;
  hasDescription?: boolean;
  hasAddress?: boolean;
  hasPhotos?: boolean;
}): ShareRecipientPreview {
  const secretFuzz = input.privacy === "SECRET" || Boolean(input.fuzzyCoordinates);
  const permissionNote =
    input.permission === "EDIT" || input.permission === "MANAGE"
      ? "edit"
      : input.permission === "COMMENT"
        ? "comment"
        : "view";

  return {
    showsTitle: true,
    showsDescription: Boolean(input.hasDescription),
    showsExactCoords: !secretFuzz,
    showsAddress: Boolean(input.hasAddress) && !secretFuzz,
    showsPrivateNotes: false,
    showsPhotos: Boolean(input.hasPhotos),
    permissionNote,
    secretFuzz,
  };
}
