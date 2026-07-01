import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json(
      { status: "ok", timestamp: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return Response.json(
      { status: "error", message: String(e) },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
