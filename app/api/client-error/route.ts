import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const { ok } = await rateLimit(`client-error:${ip}`, 30, 60_000, {
    failClosed: true,
  });
  if (!ok) return NextResponse.json({ ok: false }, { status: 429 });

  try {
    const body = await req.json();
    const payload = {
      message: typeof body?.message === "string" ? body.message.slice(0, 500) : "unknown",
      stack: typeof body?.stack === "string" ? body.stack.slice(0, 2000) : undefined,
      href: typeof body?.href === "string" ? body.href.slice(0, 500) : undefined,
      ua: req.headers.get("user-agent")?.slice(0, 200),
      at: new Date().toISOString(),
    };

    console.error("[client-error]", payload);

    const webhook = process.env.ERROR_WEBHOOK_URL;
    if (webhook) {
      // Fire-and-forget — do not block the client on Slack/Discord latency
      void fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `HiddenSpots client error: ${payload.message}\n${payload.href ?? ""}\n${payload.ua ?? ""}`,
          content: `**HiddenSpots** \`${payload.message}\`\n${payload.href ?? ""}`,
        }),
      }).catch(() => {
        /* ignore webhook failures */
      });
    }
  } catch {
    /* ignore malformed */
  }
  return NextResponse.json({ ok: true });
}
