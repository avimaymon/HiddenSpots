import { auth } from "@/lib/auth/config";
import { rateLimit } from "@/lib/rate-limit";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ok } = rateLimit(`upload:${session.user.id}`, 15, 60_000);
  if (!ok) {
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED.includes(file.type)) {
    return Response.json({ error: "Invalid file type" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return Response.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const filename = `${session.user.id}/${randomUUID()}.${ext}`;

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(filename, file, {
        access: "public",
        addRandomSuffix: false,
      });
      return Response.json({ url: blob.url, key: blob.pathname });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    const localName = `${randomUUID()}.${ext}`;
    await writeFile(path.join(uploadsDir, localName), buffer);
    return Response.json({ url: `/uploads/${localName}` });
  } catch (e) {
    console.error("Upload failed:", e);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
