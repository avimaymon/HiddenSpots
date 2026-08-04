import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getLocationById } from "@/lib/actions/locations";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { LocationDetailPageClient } from "@/components/locations/LocationDetailPageClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Map } from "lucide-react";
import { buildPageAlternates, OG_LOCALE, SITE_NAME } from "@/lib/seo/site";
import { routing, type Locale } from "@/i18n/routing";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locale: raw } = await params;
  const locale = (routing.locales.includes(raw as Locale) ? raw : routing.defaultLocale) as Locale;
  const loc = await getLocationById(id);
  const title = loc?.title ?? "Location";
  const description = loc?.description?.slice(0, 160) || undefined;
  const alternates = buildPageAlternates(locale, `/locations/${id}`);
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

export default async function LocationDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const loc = await getLocationById(id);

  if (!loc) notFound();

  const [categories, uniqueVisitorCount] = await Promise.all([
    prisma.category.findMany({
      where: { OR: [{ userId: session!.user!.id }, { isSystem: true }] },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.visit.groupBy({
      by: ["userId"],
      where: { locationId: id },
    }).then((rows) => rows.length),
  ]);

  const isVerified = uniqueVisitorCount >= 3;
  const [tl, tn] = await Promise.all([
    getTranslations("locations"),
    getTranslations("nav"),
  ]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 glass-strong shrink-0">
        <Button variant="ghost" size="icon-sm" className="rounded-xl" asChild>
          <Link href="/locations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="font-bold text-sm truncate flex-1">
          {loc.title}
          {isVerified && (
            // ms-, not ml-: this sits beside a Hebrew title and was pinned to
            // the left of it in RTL.
            <span className="ms-1.5 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">
              ✓ {tl("verifiedBadge")}
            </span>
          )}
        </h1>
        <Button variant="outline" size="sm" className="rounded-xl shrink-0" asChild>
          <Link href={`/app?spot=${id}`}>
            <Map className="h-3.5 w-3.5" /> {tn("map")}
          </Link>
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        <LocationDetailPageClient locationId={id} categories={categories} />
      </div>
    </div>
  );
}
