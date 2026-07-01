import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTripById } from "@/lib/actions/trips";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { TripDetailClientPage } from "@/components/trips/TripDetailClientPage";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const trip = await getTripById(id);
  return { title: trip?.name ?? "Trip" };
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
