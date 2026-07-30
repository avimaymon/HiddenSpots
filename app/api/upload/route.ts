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
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ok } = await rateLimit(`upload:${session.user.id}`, 15, 60_000);
  if (!ok) {
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const locationId = formData.get("locationId");
  const forceStrip = formData.get("stripExif") === "1";

  if (!file || !(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED.includes(file.type)) {
    return Response.json({ error: "Invalid file type" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return Response.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  let strip = forceStrip;
  if (!strip && typeof locationId === "string" && locationId) {
    const loc = await prisma.location.findFirst({
      where: { id: locationId, userId: session.user.id },
      select: { privacy: true, fuzzyCoordinates: true },
    });
    strip = loc?.privacy === "SECRET" || loc?.fuzzyCoordinates === true;
  }

  let bytes: Buffer = Buffer.from(await file.arrayBuffer());
  if (shouldStripExif(file.type, strip)) {
    bytes = Buffer.from(stripJpegExif(bytes));
  }

  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const filename = `${session.user.id}/${randomUUID()}.${ext}`;

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(filename, bytes, {
        access: "public",
        addRandomSuffix: false,
        contentType: file.type,
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
