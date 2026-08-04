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
import { enqueueSync } from "@/lib/offline/db";
import {
  COLLECTIONS_CACHE_KEY,
  locationCollectionsCacheKey,
  readEntityCache,
  writeEntityCache,
} from "@/lib/offline/entity-cache";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface Props {
  locationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Collection = Awaited<ReturnType<typeof getCollections>>[number];

export function AddToCollectionDialog({ locationId, open, onOpenChange }: Props) {
  const t = useTranslations("collections");
  const tc = useTranslations("common");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    async function load() {
      if (!navigator.onLine) {
        const cached = readEntityCache<Collection[]>(COLLECTIONS_CACHE_KEY) ?? [];
        const members = readEntityCache<string[]>(locationCollectionsCacheKey(locationId)) ?? [];
        setCollections(cached);
        setMemberIds(new Set(members));
        setLoading(false);
        return;
      }
      try {
        const [cols, memberList] = await Promise.all([
          getCollections(),
          getLocationCollectionIds(locationId),
        ]);
        setCollections(cols);
        setMemberIds(new Set(memberList));
        writeEntityCache(COLLECTIONS_CACHE_KEY, cols);
        writeEntityCache(locationCollectionsCacheKey(locationId), memberList);
      } catch {
        const cached = readEntityCache<Collection[]>(COLLECTIONS_CACHE_KEY) ?? [];
        const members = readEntityCache<string[]>(locationCollectionsCacheKey(locationId)) ?? [];
        setCollections(cached);
        setMemberIds(new Set(members));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [open, locationId]);

  function persistMembers(next: Set<string>) {
    writeEntityCache(locationCollectionsCacheKey(locationId), [...next]);
  }

  async function toggle(collectionId: string) {
    setBusy(collectionId);
    const removing = memberIds.has(collectionId);
    try {
      if (!navigator.onLine) {
        await enqueueSync(removing ? "collection-remove" : "collection-add", {
          collectionId,
          locationId,
        });
        setMemberIds((s) => {
          const n = new Set(s);
          if (removing) n.delete(collectionId);
          else n.add(collectionId);
          persistMembers(n);
          return n;
        });
        toast({
          title: removing ? t("removeFromCollection") : t("locationAdded"),
          description: t("savedOffline"),
          variant: "success",
        });
        return;
      }

      if (removing) {
        await removeLocationFromCollection(collectionId, locationId);
        setMemberIds((s) => {
          const n = new Set(s);
          n.delete(collectionId);
          persistMembers(n);
          return n;
        });
        toast({ title: t("removeFromCollection"), variant: "success" });
      } else {
        await addLocationToCollection(collectionId, locationId);
        setMemberIds((s) => {
          const n = new Set(s).add(collectionId);
          persistMembers(n);
          return n;
        });
        toast({ title: t("locationAdded"), variant: "success" });
      }
    } catch {
      toast({ title: t("locationAddFailed"), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" description={t("addToCollectionTitle")}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-4 w-4 text-primary" />
            {t("addToCollectionTitle")}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : collections.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t("noCollectionsHint")}
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
                    <p className="text-xs text-muted-foreground">{col._count.locations} {t("spots")}</p>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>{tc("done")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
