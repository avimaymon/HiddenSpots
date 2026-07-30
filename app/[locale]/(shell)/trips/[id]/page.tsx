import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTripById } from "@/lib/actions/trips";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { TripDetailClientPage } from "@/components/trips/TripDetailClientPage";
import { buildPageAlternates, OG_LOCALE, SITE_NAME } from "@/lib/seo/site";
import { routing, type Locale } from "@/i18n/routing";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locale: raw } = await params;
  const locale = (routing.locales.includes(raw as Locale) ? raw : routing.defaultLocale) as Locale;
  const trip = await getTripById(id);
  const title = trip?.name ?? "Trip";
  const description = trip?.description?.slice(0, 160) || undefined;
  const alternates = buildPageAlternates(locale, `/trips/${id}`);
  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      title,
      description,
      url: alternates.canonical,
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function TripDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const trip = await getTripById(id);
  if (!trip) notFound();

  const locations = await prisma.location.findMany({
    where: { userId: session!.user!.id, deletedAt: null },
    select: { id: true, title: true, latitude: true, longitude: true, category: { select: { color: true } } },
    orderBy: { title: "asc" },
  });

  return <TripDetailClientPage trip={trip} allLocations={locations} />;
}
