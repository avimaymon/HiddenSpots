import { LocationCardsSkeleton } from "@/components/ui/skeleton";

export default function LocationsLoading() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <div className="h-9 flex-1 rounded-xl bg-muted/60 animate-pulse" />
        <div className="h-9 w-9 rounded-xl bg-muted/60 animate-pulse" />
      </div>
      <LocationCardsSkeleton count={6} />
    </div>
  );
}
