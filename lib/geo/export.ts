type ExportLocation = {
  title: string;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  description?: string | null;
  address?: string | null;
  createdAt: Date;
};

export function toGeoJSON(locations: ExportLocation[]): string {
  const geojson = {
    type: "FeatureCollection",
    features: locations.map((loc) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [
          loc.longitude,
          loc.latitude,
          ...(loc.altitude ? [loc.altitude] : []),
        ],
      },
      properties: {
        name: loc.title,
        description: loc.description,
        address: loc.address,
        created: loc.createdAt.toISOString(),
      },
    })),
  };
  return JSON.stringify(geojson, null, 2);
}

export function toGPX(locations: ExportLocation[]): string {
  const wpts = locations
    .map(
      (loc) =>
        `  <wpt lat="${loc.latitude}" lon="${loc.longitude}">
    <name>${escapeXml(loc.title)}</name>${loc.altitude ? `\n    <ele>${loc.altitude}</ele>` : ""}${loc.description ? `\n    <desc>${escapeXml(loc.description)}</desc>` : ""}
    <time>${loc.createdAt.toISOString()}</time>
  </wpt>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="HiddenSpots" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>HiddenSpots Export</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
${wpts}
</gpx>`;
}

export function toKML(locations: ExportLocation[]): string {
  const placemarks = locations
    .map(
      (loc) =>
        `  <Placemark>
    <name>${escapeXml(loc.title)}</name>${loc.description ? `\n    <description>${escapeXml(loc.description)}</description>` : ""}
    <Point>
      <coordinates>${loc.longitude},${loc.latitude}${loc.altitude ? `,${loc.altitude}` : ""}</coordinates>
    </Point>
  </Placemark>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>HiddenSpots Export</name>
${placemarks}
  </Document>
</kml>`;
}

export function toCSV(locations: ExportLocation[]): string {
  const header = "name,latitude,longitude,altitude,description,address,created";
  const rows = locations.map(
    (loc) =>
      [
        csvCell(loc.title),
        loc.latitude,
        loc.longitude,
        loc.altitude ?? "",
        csvCell(loc.description ?? ""),
        csvCell(loc.address ?? ""),
        loc.createdAt.toISOString(),
      ].join(",")
  );
  return [header, ...rows].join("\n");
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function csvCell(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
