import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anon";
  const { ok } = rateLimit(`geocode:${session.user.id ?? ip}`, 20, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const q = req.nextUrl.searchParams.get("q");
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");

  if (lat && lng) {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "User-Agent": "HiddenSpots/1.0" } }
    );
    if (!res.ok) return NextResponse.json({ error: "Geocode failed" }, { status: 502 });
    const data = await res.json();
    return NextResponse.json({
      address: data.display_name,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
    });
  }

  if (!q) {
    return NextResponse.json({ error: "Missing q, lat, or lng" }, { status: 400 });
  }

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
    { headers: { "User-Agent": "HiddenSpots/1.0" } }
  );
  if (!res.ok) return NextResponse.json({ error: "Geocode failed" }, { status: 502 });
  const results = await res.json();
  return NextResponse.json({
    results: results.map((r: { display_name: string; lat: string; lon: string }) => ({
      address: r.display_name,
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
    })),
  });
}
