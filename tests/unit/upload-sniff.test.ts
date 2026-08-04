import { describe, expect, it } from "vitest";

/** Mirror of sniff in upload route — keep in sync if magic bytes change. */
function sniffImageMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buf.length >= 6) {
    const sig = buf.toString("ascii", 0, 6);
    if (sig === "GIF87a" || sig === "GIF89a") return "image/gif";
  }
  return null;
}

describe("upload MIME sniff", () => {
  it("detects jpeg/png/gif/webp magic", () => {
    expect(sniffImageMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
      "image/png"
    );
    expect(sniffImageMime(Buffer.from("GIF89a...."))).toBe("image/gif");
    const webp = Buffer.alloc(12);
    webp.write("RIFF", 0);
    webp.write("WEBP", 8);
    expect(sniffImageMime(webp)).toBe("image/webp");
  });

  it("rejects spoofed html", () => {
    expect(sniffImageMime(Buffer.from("<!DOCTYPE html>"))).toBeNull();
  });
});
