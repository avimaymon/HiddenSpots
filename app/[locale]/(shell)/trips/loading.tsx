import { TripListSkeleton } from "@/components/ui/skeleton";

export default function TripsLoading() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <div className="h-7 w-32 rounded-lg bg-muted/60 animate-pulse" />
        <div className="ms-auto h-9 w-28 rounded-xl bg-muted/60 animate-pulse" />
      </div>
      <TripListSkeleton count={5} />
    </div>
  );
}
