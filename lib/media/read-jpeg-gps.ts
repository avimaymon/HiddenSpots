/**
 * Read GPS from JPEG EXIF (APP1). Works in browser + Node (Uint8Array).
 * Ceiling: JPEG only; HEIC unsupported.
 */
export function readJpegGps(input: ArrayBuffer | Uint8Array): { lat: number; lng: number } | null {
  const buffer = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (buffer.length < 12 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];
    if (marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    const size = view.getUint16(offset + 2);
    const segStart = offset + 4;
    if (marker === 0xe1) {
      const gps = parseExifGps(buffer.subarray(segStart, offset + 2 + size));
      if (gps) return gps;
    }
    offset += 2 + size;
  }
  return null;
}

function parseExifGps(app1: Uint8Array): { lat: number; lng: number } | null {
  if (app1.length < 14) return null;
  const head = String.fromCharCode(...app1.subarray(0, 4));
  if (head !== "Exif") return null;
  const tiff = app1.subarray(6);
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const le = String.fromCharCode(tiff[0], tiff[1]) === "II";
  const u16 = (o: number) => view.getUint16(o, le);
  const u32 = (o: number) => view.getUint32(o, le);

  const ifd0 = u32(4);
  if (ifd0 + 2 > tiff.length) return null;
  const gpsOffset = findTagOffset(tiff, view, ifd0, 0x8825, le, u16, u32);
  if (gpsOffset == null) return null;

  const latRef = findAsciiTag(tiff, view, gpsOffset, 0x0001, le, u16, u32);
  const lngRef = findAsciiTag(tiff, view, gpsOffset, 0x0003, le, u16, u32);
  const lat = findRationalTag(tiff, view, gpsOffset, 0x0002, le, u16, u32);
  const lng = findRationalTag(tiff, view, gpsOffset, 0x0004, le, u16, u32);
  if (lat == null || lng == null) return null;

  let latitude = lat;
  let longitude = lng;
  if (latRef?.startsWith("S")) latitude = -latitude;
  if (lngRef?.startsWith("W")) longitude = -longitude;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { lat: latitude, lng: longitude };
}

function findTagOffset(
  tiff: Uint8Array,
  _view: DataView,
  ifd: number,
  tag: number,
  _le: boolean,
  u16: (o: number) => number,
  u32: (o: number) => number
): number | null {
  const count = u16(ifd);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > tiff.length) break;
    if (u16(entry) === tag && u16(entry + 2) === 4) {
      return u32(entry + 8);
    }
  }
  return null;
}

function findAsciiTag(
  tiff: Uint8Array,
  _view: DataView,
  ifd: number,
  tag: number,
  _le: boolean,
  u16: (o: number) => number,
  u32: (o: number) => number
): string | null {
  const count = u16(ifd);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (u16(entry) !== tag) continue;
    const type = u16(entry + 2);
    const len = u32(entry + 4);
    if (type !== 2) continue;
    const valOff = len <= 4 ? entry + 8 : u32(entry + 8);
    return String.fromCharCode(...tiff.subarray(valOff, valOff + len)).replace(/\0/g, "");
  }
  return null;
}

function findRationalTag(
  tiff: Uint8Array,
  view: DataView,
  ifd: number,
  tag: number,
  le: boolean,
  u16: (o: number) => number,
  u32: (o: number) => number
): number | null {
  const count = u16(ifd);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (u16(entry) !== tag) continue;
    const type = u16(entry + 2);
    const len = u32(entry + 4);
    if (type !== 5 || len < 3) continue;
    const valOff = u32(entry + 8);
    const readRat = (o: number) => {
      const num = view.getUint32(o, le);
      const den = view.getUint32(o + 4, le);
      return den === 0 ? 0 : num / den;
    };
    const d = readRat(valOff);
    const m = readRat(valOff + 8);
    const s = readRat(valOff + 16);
    return d + m / 60 + s / 3600;
  }
  return null;
}
