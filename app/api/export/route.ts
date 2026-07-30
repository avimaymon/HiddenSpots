import { auth } from "@/lib/auth/config";
import { getLocationsForExport } from "@/lib/actions/settings";
import { toGeoJSON, toGPX, toCSV, toKML } from "@/lib/geo/export";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "geojson";
  const collectionId = searchParams.get("collectionId");
  const tripId = searchParams.get("tripId");

  let locations: Awaited<ReturnType<typeof getLocationsForExport>>;

  if (collectionId) {
    const cl = await prisma.collectionLocation.findMany({
      where: { collectionId, collection: { userId: session.user.id } },
      include: { location: { select: { title: true, latitude: true, longitude: true, altitude: true, description: true, address: true, createdAt: true } } },
    });
    locations = cl.map((c) => c.location);
  } else if (tripId) {
    const tl = await prisma.tripLocation.findMany({
      where: { tripId, trip: { userId: session.user.id } },
      include: { location: { select: { title: true, latitude: true, longitude: true, altitude: true, description: true, address: true, createdAt: true } } },
      orderBy: { sortOrder: "asc" },
    });
    locations = tl.map((t) => t.location);
  } else {
    locations = await getLocationsForExport();
  }

  if (format === "gpx") {
    return new Response(toGPX(locations), {
      headers: {
        "Content-Type": "application/gpx+xml",
        "Content-Disposition": 'attachment; filename="hiddenspots.gpx"',
      },
    });
  }

  if (format === "csv") {
    return new Response(toCSV(locations), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="hiddenspots.csv"',
      },
    });
  }

  if (format === "kml") {
    return new Response(toKML(locations), {
      headers: {
        "Content-Type": "application/vnd.google-earth.kml+xml",
        "Content-Disposition": 'attachment; filename="hiddenspots.kml"',
      },
    });
  }

  return new Response(toGeoJSON(locations), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="hiddenspots.json"',
    },
  });
}
