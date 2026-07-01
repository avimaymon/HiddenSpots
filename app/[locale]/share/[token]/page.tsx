import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getShareByToken, recordShareView } from "@/lib/actions/shares";
import { SharePublicPage } from "@/components/share/SharePublicPage";

interface Props {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: "Shared — HiddenSpots",
  robots: { index: false, follow: false },
};

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const share = await getShareByToken(token);

  if (!share) notFound();
  if (share.expiresAt && share.expiresAt < new Date()) notFound();

  await recordShareView(token);

  return <SharePublicPage share={share} />;
}
