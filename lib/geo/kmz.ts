/**
 * Extract KML text from a KMZ (ZIP) ArrayBuffer.
 * Supports store + deflate entries via DecompressionStream when available.
 */
export async function kmlFromKmz(buffer: ArrayBuffer): Promise<string> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Find central directory / local file headers
  let offset = 0;
  while (offset + 30 < bytes.length) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break; // local file header

    const method = view.getUint16(offset + 8, true);
    const compSize = view.getUint32(offset + 18, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const name = new TextDecoder().decode(bytes.subarray(nameStart, nameStart + nameLen));
    const dataStart = nameStart + nameLen + extraLen;
    const data = bytes.subarray(dataStart, dataStart + compSize);

    if (name.toLowerCase().endsWith(".kml")) {
      if (method === 0) {
        return new TextDecoder().decode(data);
      }
      if (method === 8 && typeof DecompressionStream !== "undefined") {
        const ds = new DecompressionStream("deflate-raw");
        const stream = new Blob([data]).stream().pipeThrough(ds);
        return await new Response(stream).text();
      }
      throw new Error("KMZ_DEFLATE_UNSUPPORTED");
    }

    offset = dataStart + compSize;
  }

  throw new Error("KMZ_NO_KML");
}
