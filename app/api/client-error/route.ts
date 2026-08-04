import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { escapeWebhookText } from "@/lib/observability/webhook";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const { ok } = await rateLimit(`client-error:${ip}`, 30, 60_000, {
    failClosed: true,
  });
  if (!ok) return NextResponse.json({ ok: false }, { status: 429 });

  try {
    const body = await req.json();
    const payload = {
      tag: "client-error",
      message: typeof body?.message === "string" ? body.message.slice(0, 500) : "unknown",
      stack: typeof body?.stack === "string" ? body.stack.slice(0, 2000) : undefined,
      href: typeof body?.href === "string" ? body.href.slice(0, 500) : undefined,
      // The digest is the only key that ties this report to the corresponding
      // server-side log line. The client has always sent it; it was dropped here.
      digest: typeof body?.digest === "string" ? body.digest.slice(0, 100) : undefined,
      ua: req.headers.get("user-agent")?.slice(0, 200),
      at: new Date().toISOString(),
    };

    // JSON so fields are queryable in Vercel/Datadog rather than a flat string.
    console.error(JSON.stringify(payload));

    const webhook = process.env.ERROR_WEBHOOK_URL;
    if (webhook) {
      const message = escapeWebhookText(payload.message);
      const href = escapeWebhookText(payload.href ?? "");
      const digest = payload.digest ? ` (digest ${escapeWebhookText(payload.digest)})` : "";
      // Fire-and-forget — do not block the client on Slack/Discord latency
      void fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `HiddenSpots client error${digest}: ${message}\n${href}`,
          content: `**HiddenSpots**${digest} \`${message}\`\n${href}`,
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
