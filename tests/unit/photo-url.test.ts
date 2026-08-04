import { describe, expect, it } from "vitest";
import { isAllowedPhotoUrl } from "@/lib/media/photo-url";

describe("isAllowedPhotoUrl", () => {
  it("allows local uploads and Vercel blob", () => {
    expect(isAllowedPhotoUrl("/uploads/abc-123.jpg")).toBe(true);
    expect(
      isAllowedPhotoUrl("https://abc.public.blob.vercel-storage.com/u/x.jpg")
    ).toBe(true);
  });

  it("rejects tracking / arbitrary hosts and traversal", () => {
    expect(isAllowedPhotoUrl("https://evil.example/pixel.gif")).toBe(false);
    expect(isAllowedPhotoUrl("/uploads/../etc/passwd")).toBe(false);
    expect(isAllowedPhotoUrl("http://public.blob.vercel-storage.com/x")).toBe(false);
    expect(isAllowedPhotoUrl("javascript:alert(1)")).toBe(false);
  });
});
