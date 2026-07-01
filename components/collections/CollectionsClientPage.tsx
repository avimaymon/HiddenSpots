"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Plus, FolderOpen, MapPin, Trash2, Loader2, Share2 } from "lucide-react";
import { DbShareDialog } from "@/components/shared/DbShareDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createCollection, deleteCollection } from "@/lib/actions/collections";
import { toast } from "@/hooks/use-toast";

type Collection = Awaited<ReturnType<typeof import("@/lib/actions/collections").getCollections>>[number];

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7"];

interface Props {
  initialCollections: Collection[];
}

export function CollectionsClientPage({ initialCollections }: Props) {
  const [collections, setCollections] = useState(initialCollections);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [shareCol, setShareCol] = useState<{ id: string; name: string } | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const col = await createCollection({ name: name.trim(), color });
      setCollections((c) => [...c, { ...col, _count: { locations: 0 }, locations: [] }]);
      setOpen(false);
      setName("");
      toast({ title: "Collection created", variant: "success" });
    } catch {
      toast({ title: "Failed to create", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this collection? Spots won't be deleted.")) return;
    await deleteCollection(id);
    setCollections((c) => c.filter((x) => x.id !== id));
    toast({ title: "Collection deleted" });
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader title="Collections" description={`${collections.length} lists`}>
        <Button size="sm" className="rounded-xl" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40dvh] text-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FolderOpen className="h-8 w-8 text-primary" />
            </div>
            <p className="font-semibold">No collections yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">Group spots into themed lists — family trips, waterfalls, camping…</p>
            <Button className="rounded-xl" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Create Collection
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((col) => (
              <div
                key={col.id}
                className="group rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all"
              >
                <Link href={`/app?collection=${col.id}`} className="block p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${col.color}20`, color: col.color }}
                    >
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate">{col.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {col._count.locations} spots
                      </p>
                    </div>
                  </div>
                  {col.locations.length > 0 && (
                    <div className="flex gap-1 mt-3">
                      {col.locations.slice(0, 4).map(({ location }) => (
                        <div key={location.id} className="relative h-10 w-10 rounded-lg overflow-hidden bg-muted flex-1 max-w-12">
                          {location.photos[0] ? (
                            <Image src={location.photos[0].url} alt="" fill className="object-cover" />
                          ) : (
                            <div className="h-full flex items-center justify-center">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Link>
                <div className="px-4 pb-3 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon-sm" className="rounded-lg" onClick={() => setShareCol({ id: col.id, name: col.name })}>
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="text-destructive rounded-lg" onClick={() => handleDelete(col.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {shareCol && (
        <DbShareDialog
          open={!!shareCol}
          onOpenChange={(o) => !o && setShareCol(null)}
          collectionId={shareCol.id}
          title={shareCol.name}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Summer waterfalls…" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="h-8 w-8 rounded-full border-2 transition-all"
                    style={{
                      background: c,
                      borderColor: color === c ? "hsl(var(--foreground))" : "transparent",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading || !name.trim()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
