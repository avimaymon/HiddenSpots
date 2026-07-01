import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getLocationById } from "@/lib/actions/locations";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { LocationDetailPageClient } from "@/components/locations/LocationDetailPageClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Map } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const loc = await getLocationById(id);
  return { title: loc?.title ?? "Location" };
}

export default async function LocationDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const loc = await getLocationById(id);

  if (!loc) notFound();

  const categories = await prisma.category.findMany({
    where: { OR: [{ userId: session!.user!.id }, { isSystem: true }] },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 glass-strong shrink-0">
        <Button variant="ghost" size="icon-sm" className="rounded-xl" asChild>
          <Link href="/locations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="font-bold text-sm truncate flex-1">{loc.title}</h1>
        <Button variant="outline" size="sm" className="rounded-xl shrink-0" asChild>
          <Link href={`/app?spot=${id}`}>
            <Map className="h-3.5 w-3.5" /> Map
          </Link>
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        <LocationDetailPageClient locationId={id} categories={categories} />
      </div>
    </div>
  );
}
