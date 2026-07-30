import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const { ok } = await rateLimit(`client-error:${ip}`, 30, 60_000);
  if (!ok) return NextResponse.json({ ok: false }, { status: 429 });

  try {
    const body = await req.json();
    console.error("[client-error]", {
      message: body?.message,
      stack: typeof body?.stack === "string" ? body.stack.slice(0, 2000) : undefined,
      href: body?.href,
      ua: req.headers.get("user-agent")?.slice(0, 200),
    });
  } catch {
    /* ignore malformed */
  }
  return NextResponse.json({ ok: true });
}
