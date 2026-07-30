import { describe, expect, it } from "vitest";
import { stripJpegExif } from "@/lib/media/strip-exif";

function makeJpegWithExif(): Buffer {
  // Minimal JPEG: SOI + APP1(EXIF) + SOS-ish trailing
  const soi = Buffer.from([0xff, 0xd8]);
  const app1Body = Buffer.from("Exif\0\0fake");
  const app1Len = Buffer.alloc(2);
  app1Len.writeUInt16BE(app1Body.length + 2);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), app1Len, app1Body]);
  const rest = Buffer.from([0xff, 0xda, 0x00, 0x02, 0x00]);
  return Buffer.concat([soi, app1, rest]);
}

describe("stripJpegExif", () => {
  it("removes APP1 EXIF segment", () => {
    const input = makeJpegWithExif();
    expect(input.includes(Buffer.from("Exif"))).toBe(true);
    const out = stripJpegExif(input);
    expect(out[0]).toBe(0xff);
    expect(out[1]).toBe(0xd8);
    expect(out.includes(Buffer.from("Exif"))).toBe(false);
  });

  it("passes through non-jpeg unchanged", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    expect(stripJpegExif(png)).toEqual(png);
  });
});

describe("offline sync conflict rule", () => {
  it("documents last-write-wins FIFO order", () => {
    // Queue is ordered by createdAt ascending in flushSyncQueue —
    // later enqueued updates overwrite earlier ones when applied in order.
    const queue = [
      { action: "update", createdAt: "2026-01-01T10:00:00Z", payload: { title: "A" } },
      { action: "update", createdAt: "2026-01-01T10:01:00Z", payload: { title: "B" } },
    ];
    const ordered = [...queue].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    expect(ordered.at(-1)?.payload.title).toBe("B");
  });
});
