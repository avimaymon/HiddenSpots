"use client";

import { useEffect, useState } from "react";
import { FolderPlus, Loader2, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getCollections,
  getLocationCollectionIds,
  addLocationToCollection,
  removeLocationFromCollection,
} from "@/lib/actions/collections";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  locationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Collection = Awaited<ReturnType<typeof getCollections>>[number];

export function AddToCollectionDialog({ locationId, open, onOpenChange }: Props) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([getCollections(), getLocationCollectionIds(locationId)]).then(
      ([cols, memberList]) => {
        setCollections(cols);
        setMemberIds(new Set(memberList));
        setLoading(false);
      }
    );
  }, [open, locationId]);

  async function toggle(collectionId: string) {
    setBusy(collectionId);
    try {
      if (memberIds.has(collectionId)) {
        await removeLocationFromCollection(collectionId, locationId);
        setMemberIds((s) => { const n = new Set(s); n.delete(collectionId); return n; });
        toast({ title: "Removed from collection", variant: "success" });
      } else {
        await addLocationToCollection(collectionId, locationId);
        setMemberIds((s) => new Set(s).add(collectionId));
        toast({ title: "Added to collection", variant: "success" });
      }
    } catch {
      toast({ title: "Failed to update collection", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-4 w-4 text-primary" />
            Add to Collection
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : collections.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No collections yet. Create one from the Collections page.
          </p>
        ) : (
          <div className="space-y-2 max-h-[50dvh] overflow-y-auto">
            {collections.map((col) => {
              const isMember = memberIds.has(col.id);
              return (
                <button
                  key={col.id}
                  type="button"
                  disabled={busy === col.id}
                  onClick={() => toggle(col.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-start",
                    isMember
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/50 hover:border-primary/25 hover:bg-muted/50"
                  )}
                >
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${col.color}20` }}
                  >
                    <span className="text-sm font-bold" style={{ color: col.color }}>
                      {col._count.locations}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{col.name}</p>
                    <p className="text-xs text-muted-foreground">{col._count.locations} spots</p>
                  </div>
                  {busy === col.id ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : isMember ? (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
