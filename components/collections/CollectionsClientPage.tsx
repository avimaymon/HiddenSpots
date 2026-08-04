"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Plus, FolderOpen, MapPin, Trash2, Loader2, Share2, Users } from "lucide-react";
import { DbShareDialog } from "@/components/shared/DbShareDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCollection, deleteCollection } from "@/lib/actions/collections";
import { dropSyncItemsMatchingClientId, enqueueSync } from "@/lib/offline/db";
import { isPendingOfflineId } from "@/lib/offline/pending";
import {
  COLLECTIONS_CACHE_KEY,
  ID_REMAP_EVENT,
  writeEntityCache,
  type IdRemapDetail,
} from "@/lib/offline/entity-cache";
import { toast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

type Collection = Awaited<ReturnType<typeof import("@/lib/actions/collections").getCollections>>[number];

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7"];
const NO_PARENT = "__none__";

interface Props {
  initialCollections: Collection[];
}

type FlatRow = Collection & { depth: number };

function flattenCollections(collections: Collection[]): FlatRow[] {
  const byParent = new Map<string | null, Collection[]>();
  for (const col of collections) {
    const key = col.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(col);
    byParent.set(key, list);
  }
  const out: FlatRow[] = [];
  function walk(parentId: string | null, depth: number) {
    for (const col of byParent.get(parentId) ?? []) {
      out.push({ ...col, depth });
      walk(col.id, depth + 1);
    }
  }
  walk(null, 0);
  // Orphans (parent missing from list) still show at root
  const seen = new Set(out.map((c) => c.id));
  for (const col of collections) {
    if (!seen.has(col.id)) out.push({ ...col, depth: 0 });
  }
  return out;
}

export function CollectionsClientPage({ initialCollections }: Props) {
  const t = useTranslations("collections");
  const tc = useTranslations("common");
  const [collections, setCollections] = useState(initialCollections);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [parentId, setParentId] = useState<string>(NO_PARENT);
  const [loading, setLoading] = useState(false);
  const [shareCol, setShareCol] = useState<{ id: string; name: string; partner?: boolean } | null>(null);

  const flat = useMemo(() => flattenCollections(collections), [collections]);

  useEffect(() => {
    function onRemap(e: Event) {
      const { clientId, serverId } = (e as CustomEvent<IdRemapDetail>).detail;
      setCollections((prev) => {
        const next = prev.map((col) => ({
          ...col,
          id: col.id === clientId ? serverId : col.id,
          parentId: col.parentId === clientId ? serverId : col.parentId,
        }));
        writeEntityCache(
          COLLECTIONS_CACHE_KEY,
          next.map((c) => ({
            id: c.id,
            name: c.name,
            color: c.color,
            _count: { locations: c._count.locations },
          }))
        );
        return next;
      });
    }
    window.addEventListener(ID_REMAP_EVENT, onRemap);
    return () => window.removeEventListener(ID_REMAP_EVENT, onRemap);
  }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    const payload = {
      name: name.trim(),
      color,
      parentId: parentId === NO_PARENT ? null : parentId,
    };
    try {
      if (!navigator.onLine) {
        const clientId = crypto.randomUUID();
        await enqueueSync("collection-create", { ...payload, clientId });
        const now = new Date();
        const optimistic = {
          id: clientId,
          name: payload.name,
          color: payload.color,
          parentId: payload.parentId,
          description: null,
          icon: "folder",
          privacy: "PRIVATE" as const,
          sortOrder: 0,
          userId: "",
          createdAt: now,
          updatedAt: now,
          _count: { locations: 0 },
          locations: [] as Collection["locations"],
        } as Collection;
        const next = [...collections, optimistic];
        setCollections(next);
        writeEntityCache(
          COLLECTIONS_CACHE_KEY,
          next.map((c) => ({
            id: c.id,
            name: c.name,
            color: c.color,
            _count: { locations: c._count.locations },
          }))
        );
        setOpen(false);
        setName("");
        setParentId(NO_PARENT);
        toast({ title: t("created"), description: t("savedOffline"), variant: "success" });
        return;
      }
      const col = await createCollection(payload);
      const next = [...collections, { ...col, _count: { locations: 0 }, locations: [] as Collection["locations"] }];
      setCollections(next);
      writeEntityCache(
        COLLECTIONS_CACHE_KEY,
        next.map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          _count: { locations: c._count.locations },
        }))
      );
      setOpen(false);
      setName("");
      setParentId(NO_PARENT);
      toast({ title: t("created"), variant: "success" });
    } catch {
      toast({ title: t("createFailed"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    if (isPendingOfflineId(id)) {
      await dropSyncItemsMatchingClientId(id);
      const orphanPending = collections.filter(
        (x) => x.parentId === id && isPendingOfflineId(x.id)
      );
      for (const child of orphanPending) {
        await dropSyncItemsMatchingClientId(child.id);
      }
      const next = collections.filter((x) => x.id !== id && x.parentId !== id);
      setCollections(next);
      writeEntityCache(
        COLLECTIONS_CACHE_KEY,
        next.map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          _count: { locations: c._count.locations },
        }))
      );
      toast({ title: t("deleted") });
      return;
    }
    if (!navigator.onLine) {
      await enqueueSync("collection-delete", { collectionId: id });
      const next = collections.filter((x) => x.id !== id && x.parentId !== id);
      setCollections(next);
      writeEntityCache(
        COLLECTIONS_CACHE_KEY,
        next.map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          _count: { locations: c._count.locations },
        }))
      );
      toast({ title: t("deleted") });
      return;
    }
    await deleteCollection(id);
    setCollections((c) => c.filter((x) => x.id !== id && x.parentId !== id));
    toast({ title: t("deleted") });
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader title={t("title")} description={t("description", { count: collections.length })}>
        <Button size="sm" className="rounded-xl" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> {t("createNew")}
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40dvh] text-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FolderOpen className="h-8 w-8 text-primary" />
            </div>
            <p className="font-semibold">{t("empty")}</p>
            <p className="text-sm text-muted-foreground max-w-xs">{t("emptyHint")}</p>
            <Button className="rounded-xl" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> {t("createCollection")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-2xl">
            {flat.map((col) => {
              const pending = isPendingOfflineId(col.id);
              const body = (
                  <div className="flex items-start gap-3">
                    <div
                      className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${col.color}20`, color: col.color }}
                    >
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate">
                        {col.depth > 0 ? `${"— ".repeat(col.depth)}${col.name}` : col.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {col._count.locations} {t("spots")}
                        {col.depth > 0 ? ` · ${t("nestedFolder")}` : ""}
                        {pending ? ` · ${t("pendingSync")}` : ""}
                      </p>
                      {pending && (
                        <Badge variant="outline" className="mt-1 text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">
                          {t("pendingSync")}
                        </Badge>
                      )}
                    </div>
                  </div>
              );
              return (
              <div
                key={col.id}
                className="group rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all"
                style={{ marginInlineStart: col.depth * 20 }}
              >
                {pending ? (
                  <div className="block p-4" title={t("pendingSyncHint")}>
                    {body}
                    {col.locations.length > 0 && (
                      <div className="flex gap-1 mt-3">
                        {col.locations.slice(0, 4).map(({ location }) => (
                          <div key={location.id} className="relative h-10 w-10 rounded-lg overflow-hidden bg-muted flex-1 max-w-12">
                            {location.photos[0] ? (
                              <Image
                                src={location.photos[0].url}
                                alt=""
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="h-full flex items-center justify-center">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                <Link href={`/app?collection=${col.id}`} className="block p-4">
                  {body}
                  {col.locations.length > 0 && (
                    <div className="flex gap-1 mt-3">
                      {col.locations.slice(0, 4).map(({ location }) => (
                        <div key={location.id} className="relative h-10 w-10 rounded-lg overflow-hidden bg-muted flex-1 max-w-12">
                          {location.photos[0] ? (
                            <Image
                              src={location.photos[0].url}
                              alt=""
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
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
                )}
                <div className="px-4 pb-3 flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  {!pending && (
                    <>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-lg"
                    title={t("invitePartner")}
                    aria-label={t("invitePartner")}
                    onClick={() => setShareCol({ id: col.id, name: col.name, partner: true })}
                  >
                    <Users className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-lg"
                    title={t("shareCollection")}
                    aria-label={t("shareCollection")}
                    onClick={() => setShareCol({ id: col.id, name: col.name })}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive rounded-lg"
                    title={tc("delete")}
                    aria-label={tc("delete")}
                    onClick={() => handleDelete(col.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {shareCol && (
        <DbShareDialog
          open={!!shareCol}
          onOpenChange={(o) => !o && setShareCol(null)}
          collectionId={shareCol.id}
          title={shareCol.name}
          partnerInvite={Boolean(shareCol.partner)}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("fieldName")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("fieldNamePlaceholder")}
                className="h-11"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>{t("fieldParent")}</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue placeholder={t("fieldParentNone")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARENT}>{t("fieldParentNone")}</SelectItem>
                  {collections
                    .filter((c) => !isPendingOfflineId(c.id))
                    .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("fieldColor")}</Label>
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
            <Button variant="outline" onClick={() => setOpen(false)}>{tc("cancel")}</Button>
            <Button onClick={handleCreate} disabled={loading || !name.trim()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {tc("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
