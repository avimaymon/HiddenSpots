"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  getDeletedLocations,
  restoreLocation,
  permanentlyDeleteLocation,
} from "@/lib/actions/locations";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Deleted = Awaited<ReturnType<typeof getDeletedLocations>>;

export function TrashSection() {
  const t = useTranslations("settings");
  const [items, setItems] = useState<Deleted>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getDeletedLocations();
      if (!cancelled) {
        setItems(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRestore(id: string) {
    setBusy(id);
    try {
      await restoreLocation(id);
      toast({ title: t("restored"), variant: "success" });
      setItems(await getDeletedLocations());
    } catch (e) {
      toast({ title: String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function handlePurge(id: string) {
    if (!confirm(t("purgeConfirm"))) return;
    setBusy(id);
    try {
      await permanentlyDeleteLocation(id);
      toast({ title: t("purged"), variant: "success" });
      setItems(await getDeletedLocations());
    } catch (e) {
      toast({ title: String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border/50 p-4">
      <div>
        <h2 className="font-semibold flex items-center gap-2">
          <Trash2 className="h-4 w-4" /> {t("trashTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("trashDescription")}</p>
      </div>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("trashEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-xl border border-border/40 px-3 py-2"
            >
              <span className="flex-1 text-sm font-medium truncate">{item.title}</span>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                disabled={busy === item.id}
                onClick={() => handleRestore(item.id)}
              >
                <RotateCcw className="h-3.5 w-3.5" /> {t("restore")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl text-destructive"
                disabled={busy === item.id}
                onClick={() => handlePurge(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
