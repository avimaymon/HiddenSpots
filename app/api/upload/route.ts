import { auth } from "@/lib/auth/config";
import { rateLimit } from "@/lib/rate-limit";
import { put } from "@vercel/blob";
import { shouldStripExif, stripJpegExif } from "@/lib/media/strip-exif";

export const runtime = "nodejs";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

function sniffImageMime(buf: Buffer): (typeof ALLOWED)[number] | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
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

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ok } = await rateLimit(`upload:${session.user.id}`, 15, 60_000, {
    failClosed: true,
  });
  if (!ok) {
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const locationId = formData.get("locationId");

  if (typeof locationId !== "string" || !locationId) {
    return Response.json({ error: "locationId required" }, { status: 400 });
  }

  if (!file || !(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (!(ALLOWED as readonly string[]).includes(file.type)) {
    return Response.json({ error: "Invalid file type" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return Response.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  const loc = await prisma.location.findFirst({
    where: { id: locationId, userId: session.user.id, deletedAt: null },
    select: { id: true },
  });
  if (!loc) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let bytes: Buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageMime(bytes);
  if (!sniffed || sniffed !== file.type) {
    return Response.json({ error: "Invalid file content" }, { status: 400 });
  }

  // Default-on EXIF strip for GPS privacy on all authenticated uploads
  const strip = true;
  if (shouldStripExif(sniffed, strip)) {
    bytes = Buffer.from(stripJpegExif(bytes));
  }

  const ext = sniffed.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const filename = `${session.user.id}/${randomUUID()}.${ext}`;

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(filename, bytes, {
        access: "public",
        addRandomSuffix: false,
        contentType: sniffed,
      });
      return Response.json({ url: blob.url, key: blob.pathname, exifStripped: strip });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const localName = `${randomUUID()}.${ext}`;
    await writeFile(path.join(uploadsDir, localName), bytes);
    return Response.json({ url: `/uploads/${localName}`, exifStripped: strip });
  } catch (e) {
    console.error("Upload failed:", e);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
