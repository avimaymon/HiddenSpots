"use client";

import { encode } from "blurhash";

/** Generate a BlurHash string from a File or Blob in the browser. */
export async function generateBlurHash(file: Blob, cx = 4, cy = 3): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D | null;
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    return encode(data, width, height, cx, cy);
  } catch {
    return null;
  }
}
