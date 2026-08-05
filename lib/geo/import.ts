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

  try {
    if (ext === "kmz") {
      const { kmlFromKmz } = await import("@/lib/geo/kmz");
      const kml = await kmlFromKmz(await file.arrayBuffer());
      return { ...parseKML(kml), source: "KMZ" };
    }
    const text = await file.text();
    if (ext === "geojson" || ext === "json") return parseGeoJSON(text);
    if (ext === "kml") return parseKML(text);
    if (ext === "gpx") return parseGPX(text);
    if (ext === "csv") return parseCSV(text);
    throw new Error(`Unsupported format: .${ext}`);
  } catch (e) {
    return { locations: [], source: ext ?? "unknown", count: 0, errors: [String(e)] };
  }
}

/** Parse KML text (also used by My Maps URL import). */
export function parseKmlText(text: string): ImportPreview {
  return parseKML(text);
}

function parseGeoJSON(text: string): ImportPreview {
  const data = JSON.parse(text);
  const features =
    data.type === "FeatureCollection"
      ? data.features
      : data.type === "Feature"
        ? [data]
        : [];

  type GeoFeature = { geometry: { type: string; coordinates: number[] }; properties: Record<string, string | null> };
  const locations: Partial<LocationFormData>[] = (features as GeoFeature[])
    .filter((f) => f.geometry?.type === "Point")
    .map((f) => ({
      title: f.properties?.name ?? f.properties?.title ?? "Imported Location",
      description: f.properties?.description ?? undefined,
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

  /**
   * Ragged rows are the norm in hand-edited CSV. A row shorter than the header
   * yields `undefined` for the coordinate columns, and `parseFloat(undefined)`
   * is NaN — which the import action's `== null` guard does not catch, so the
   * row reached `locationSchema` and came back as a raw ZodError. The data was
   * never at risk (the schema does reject NaN), but the preview showed NaN and
   * the user was told nothing they could act on. Skipping the row and naming
   * the line number is the honest version.
   */
  const locations: Partial<LocationFormData>[] = [];
  const errors: string[] = [];

  lines.slice(1).forEach((line, i) => {
    if (!line.trim()) return;
    const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
    const latitude = parseFloat(cols[latIdx] ?? "");
    const longitude = parseFloat(cols[lngIdx] ?? "");

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      // +2: one for the header, one for 1-based line numbers.
      errors.push(`Row ${i + 2}: missing or non-numeric coordinates`);
      return;
    }

    locations.push({
      title: (nameIdx !== -1 ? cols[nameIdx] : undefined) || "CSV Location",
      latitude,
      longitude,
    });
  });

  return { locations, source: "CSV", count: locations.length, errors };
}
