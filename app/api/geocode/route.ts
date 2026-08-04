import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";

const reverseSchema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lng: z.coerce.number().finite().min(-180).max(180),
});

const searchSchema = z.object({
  q: z.string().trim().min(1).max(200),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anon";
  const { ok } = await rateLimit(`geocode:${session.user.id ?? ip}`, 20, 60_000, {
    failClosed: true,
  });
  if (!ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const q = req.nextUrl.searchParams.get("q");
  const latRaw = req.nextUrl.searchParams.get("lat");
  const lngRaw = req.nextUrl.searchParams.get("lng");

  const acceptLang = req.headers.get("accept-language")?.startsWith("en") ? "en" : "he";
  const headers = {
    "User-Agent": "HiddenSpots/1.0 (https://hiddenspots.app; nature atlas)",
    "Accept-Language": acceptLang,
  };
  const ctrl = AbortSignal.timeout(4000);

  if (latRaw !== null && lngRaw !== null) {
    const parsed = reverseSchema.safeParse({ lat: latRaw, lng: lngRaw });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }
    const { lat, lng } = parsed.data;
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "json");
    url.searchParams.set("accept-language", acceptLang);

    try {
      const res = await fetch(url, { headers, signal: ctrl });
      if (!res.ok) return NextResponse.json({ error: "Geocode failed" }, { status: 502 });
      const data = (await res.json()) as { display_name?: string };
      return NextResponse.json({
        address: data.display_name,
        latitude: lat,
        longitude: lng,
      });
    } catch {
      return NextResponse.json({ error: "Geocode failed" }, { status: 502 });
    }
  }

  if (!q) {
    return NextResponse.json({ error: "Missing q, lat, or lng" }, { status: 400 });
  }

  const search = searchSchema.safeParse({ q });
  if (!search.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", search.data.q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "il");
  url.searchParams.set("accept-language", acceptLang);

  try {
    const res = await fetch(url, { headers, signal: ctrl });
    if (!res.ok) return NextResponse.json({ error: "Geocode failed" }, { status: 502 });
    const results = (await res.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
    }>;
    return NextResponse.json({
      results: results.map((r) => ({
        address: r.display_name,
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Geocode failed" }, { status: 502 });
  }
}
