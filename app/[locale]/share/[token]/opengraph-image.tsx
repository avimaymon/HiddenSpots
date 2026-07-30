import { ImageResponse } from "next/og";
import { getShareByToken } from "@/lib/actions/shares";

export const alt = "HiddenSpots share";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const share = await getShareByToken(token);
  const title =
    share?.location?.title ||
    share?.collection?.name ||
    share?.trip?.name ||
    "HiddenSpots";
  const subtitle = share?.collection
    ? `${share.collection.locations.length} spots`
    : share?.trip
      ? `${share.trip.locations.length} stops`
      : share?.location?.category?.name ?? "Nature atlas";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(145deg, #0f2918 0%, #1a4d2e 45%, #c27803 120%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, opacity: 0.85 }}>HiddenSpots</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, maxWidth: 1000 }}>
            {title.slice(0, 80)}
          </div>
          <div style={{ fontSize: 28, opacity: 0.9 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", fontSize: 22, opacity: 0.75 }}>
          שמור לעצמך באטלס האישי · Save to your atlas
        </div>
      </div>
    ),
    { ...size }
  );
}
