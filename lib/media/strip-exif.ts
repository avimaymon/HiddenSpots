/**
 * Strip GPS EXIF from JPEG buffers so SECRET location photos cannot leak exact coords.
 * PNG/WebP/GIF returned unchanged. Pure JS — no new dependency.
 * Ceiling: only removes APP1 EXIF segments; does not re-encode.
 */
export function stripJpegExif(buffer: Buffer): Buffer {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return buffer;
  }

  const parts: Buffer[] = [buffer.subarray(0, 2)]; // SOI
  let offset = 2;

  while (offset + 4 < buffer.length) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];

    // Start of scan — copy rest
    if (marker === 0xda) {
      parts.push(buffer.subarray(offset));
      break;
    }

    // Standalone markers
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      parts.push(buffer.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }

    const size = buffer.readUInt16BE(offset + 2);
    const next = offset + 2 + size;
    // APP1 (EXIF) — skip
    if (marker === 0xe1) {
      offset = next;
      continue;
    }
    parts.push(buffer.subarray(offset, next));
    offset = next;
  }

  return Buffer.concat(parts);
}

export function shouldStripExif(mime: string, strip: boolean) {
  return strip && (mime === "image/jpeg" || mime === "image/jpg");
}
