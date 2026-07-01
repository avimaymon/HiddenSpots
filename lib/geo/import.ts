import type { LocationFormData } from "@/lib/validations/schemas";

export interface ImportPreview {
  locations: Partial<LocationFormData>[];
  source: string;
  count: number;
  errors: string[];
}

export async function parseImportFile(
  file: File
): Promise<ImportPreview> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const text = await file.text();

  try {
    if (ext === "geojson" || ext === "json") return parseGeoJSON(text);
    if (ext === "kml" || ext === "kmz") return parseKML(text);
    if (ext === "gpx") return parseGPX(text);
    if (ext === "csv") return parseCSV(text);
    throw new Error(`Unsupported format: .${ext}`);
  } catch (e) {
    return { locations: [], source: ext ?? "unknown", count: 0, errors: [String(e)] };
  }
}

function parseGeoJSON(text: string): ImportPreview {
  const data = JSON.parse(text);
  const features =
    data.type === "FeatureCollection"
      ? data.features
      : data.type === "Feature"
        ? [data]
        : [];

  const locations: Partial<LocationFormData>[] = features
    .filter((f: any) => f.geometry?.type === "Point")
    .map((f: any) => ({
      title: f.properties?.name ?? f.properties?.title ?? "Imported Location",
      description: f.properties?.description,
      longitude: f.geometry.coordinates[0],
      latitude: f.geometry.coordinates[1],
      altitude: f.geometry.coordinates[2],
    }));

  return { locations, source: "GeoJSON", count: locations.length, errors: [] };
}

function parseKML(text: string): ImportPreview {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/xml");
  const placemarks = Array.from(doc.querySelectorAll("Placemark"));

  const locations: Partial<LocationFormData>[] = placemarks.map((p) => {
    const name = p.querySelector("name")?.textContent ?? "KML Location";
    const desc = p.querySelector("description")?.textContent;
    const coords = p.querySelector("coordinates")?.textContent?.trim().split(",");
    return {
      title: name,
      description: desc ?? undefined,
      longitude: coords ? parseFloat(coords[0]) : 0,
      latitude: coords ? parseFloat(coords[1]) : 0,
      altitude: coords?.[2] ? parseFloat(coords[2]) : undefined,
    };
  });

  return { locations, source: "KML", count: locations.length, errors: [] };
}

function parseGPX(text: string): ImportPreview {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/xml");
  const waypoints = Array.from(doc.querySelectorAll("wpt"));

  const locations: Partial<LocationFormData>[] = waypoints.map((wpt) => ({
    title: wpt.querySelector("name")?.textContent ?? "GPX Waypoint",
    description: wpt.querySelector("desc")?.textContent ?? undefined,
    latitude: parseFloat(wpt.getAttribute("lat") ?? "0"),
    longitude: parseFloat(wpt.getAttribute("lon") ?? "0"),
    altitude: wpt.querySelector("ele")
      ? parseFloat(wpt.querySelector("ele")!.textContent!)
      : undefined,
  }));

  return { locations, source: "GPX", count: locations.length, errors: [] };
}

function parseCSV(text: string): ImportPreview {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { locations: [], source: "CSV", count: 0, errors: ["Empty CSV"] };

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const latIdx = headers.findIndex((h) => h.includes("lat"));
  const lngIdx = headers.findIndex((h) => h.includes("lon") || h.includes("lng"));
  const nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("title"));

  if (latIdx === -1 || lngIdx === -1) {
    return { locations: [], source: "CSV", count: 0, errors: ["CSV must have latitude/longitude columns"] };
  }

  const locations: Partial<LocationFormData>[] = lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
      return {
        title: nameIdx !== -1 ? cols[nameIdx] : "CSV Location",
        latitude: parseFloat(cols[latIdx]),
        longitude: parseFloat(cols[lngIdx]),
      };
    });

  return { locations, source: "CSV", count: locations.length, errors: [] };
}
