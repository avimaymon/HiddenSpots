"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Merge } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { findDuplicateSpotsAction, mergeLocations } from "@/lib/actions/locations";
import { Link } from "@/i18n/navigation";

type DuplicateGroup = Awaited<ReturnType<typeof findDuplicateSpotsAction>>[0];

export function DuplicatesSection() {
  const [groups, setGroups] = useState<DuplicateGroup[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function detect() {
    setLoading(true);
    try {
      const result = await findDuplicateSpotsAction();
      setGroups(result);
      if (result.length === 0) toast({ title: "No duplicates found!", variant: "success" });
    } catch (e) {
      toast({ title: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleMerge(keepId: string, deleteId: string) {
    try {
      await mergeLocations(keepId, deleteId);
      setGroups((prev) => prev?.filter((g) => !(g.some((l) => l.id === deleteId))) ?? null);
      toast({ title: "Spots merged", variant: "success" });
    } catch (e) {
      toast({ title: String(e), variant: "destructive" });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Duplicate Spot Detector</p>
          <p className="text-xs text-muted-foreground">Find spots with similar names or within 50m of each other</p>
        </div>
        <Button size="sm" variant="outline" className="rounded-xl" onClick={detect} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
          Scan
        </Button>
      </div>

      {groups?.length === 0 && (
        <p className="text-sm text-green-600 font-medium">✓ No duplicates found</p>
      )}

      {groups?.map((group, gi) => (
        <div key={gi} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-600">Potential duplicates</p>
          {group.map((loc, i) => (
            <div key={loc.id} className="flex items-center gap-2">
              <Link href={`/locations/${loc.id}`} className="text-sm flex-1 truncate hover:underline text-primary">
                {loc.title}
              </Link>
              <span className="text-xs text-muted-foreground font-mono">
                {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
              </span>
              {i > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg shrink-0 text-xs h-7 px-2"
                  onClick={() => handleMerge(group[0].id, loc.id)}
                >
                  <Merge className="h-3 w-3" /> Merge into #{1}
                </Button>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
