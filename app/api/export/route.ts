import { auth } from "@/lib/auth/config";
import { getLocationsForExport } from "@/lib/actions/settings";
import { toGeoJSON, toGPX } from "@/lib/geo/export";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "geojson";

  const locations = await getLocationsForExport();

  if (format === "gpx") {
    const body = toGPX(locations);
    return new Response(body, {
      headers: {
        "Content-Type": "application/gpx+xml",
        "Content-Disposition": 'attachment; filename="hiddenspots.gpx"',
      },
    });
  }

  const body = toGeoJSON(locations);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="hiddenspots.json"',
    },
  });
}
