"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Plus, Trash2, Heart, Eye, Bookmark, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSmartView, deleteSmartView } from "@/lib/actions/smart-views";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

type SmartView = {
  id: string;
  name: string;
  icon: string;
  color: string;
  filters: Record<string, unknown>;
  sortBy: string;
};

interface Props {
  initialViews: SmartView[];
}

const ICON_MAP: Record<string, React.ReactNode> = {
  sparkles: <Sparkles className="h-4 w-4" />,
  heart: <Heart className="h-4 w-4" />,
  eye: <Eye className="h-4 w-4" />,
  bookmark: <Bookmark className="h-4 w-4" />,
  "map-pin": <MapPin className="h-4 w-4" />,
};

export function SmartViewsSection({ initialViews }: Props) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [views, setViews] = useState<SmartView[]>(initialViews);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const PRESET_FILTERS = [
    { label: t("smartPresetFavorites"), filters: { isFavorite: true }, icon: "heart", color: "#f43f5e" },
    { label: t("smartPresetBucket"), filters: { isBucketList: true }, icon: "bookmark", color: "#f59e0b" },
    { label: t("smartPresetNotVisited"), filters: { isVisited: false }, icon: "eye", color: "#8b5cf6" },
    { label: t("smartPresetRecent"), filters: {}, sortBy: "createdAt", icon: "sparkles", color: "#22c55e" },
  ];

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const preset = PRESET_FILTERS[selectedPreset];
      const view = await createSmartView({
        name: name.trim(),
        filters: preset.filters,
        sortBy: preset.sortBy ?? "createdAt",
        icon: preset.icon,
        color: preset.color,
      });
      setViews((v) => [view as SmartView, ...v]);
      setName("");
      setCreateOpen(false);
    } catch {
      toast({ title: t("smartViewCreateFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteSmartView(id);
      setViews((v) => v.filter((sv) => sv.id !== id));
    } catch {
      toast({ title: t("smartViewDeleteFailed"), variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          {t("smartViews")}
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCreateOpen(true)}
          className="rounded-xl"
          aria-label={t("addSmartView")}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {views.length === 0 ? (
        <button
          onClick={() => setCreateOpen(true)}
          className="w-full rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground hover:border-primary/40 hover:bg-muted/20 transition-all text-center"
        >
          <Sparkles className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground/50" />
          {t("noSmartViewsHint")}
        </button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {views.map((view) => (
            <div
              key={view.id}
              className="group relative rounded-2xl border border-border/50 bg-card p-3 hover:border-primary/30 hover:shadow-md transition-all"
            >
              <Link href={`/locations?smartView=${view.id}`} className="flex flex-col gap-2">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${view.color}20`, color: view.color }}
                >
                  {ICON_MAP[view.icon] ?? <Sparkles className="h-4 w-4" />}
                </div>
                <p className="text-sm font-semibold line-clamp-2 leading-tight">{view.name}</p>
              </Link>
              <button
                onClick={() => handleDelete(view.id)}
                disabled={deletingId === view.id}
                className={cn(
                  "absolute top-2 end-2 h-6 w-6 rounded-lg flex items-center justify-center",
                  "text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors",
                  "opacity-0 group-hover:opacity-100 focus:opacity-100"
                )}
                aria-label={t("smartViewDeleteAria")}
              >
                {deletingId === view.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("addSmartView")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("smartViewName")}</Label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder={t("smartViewNamePlaceholder")}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("smartFilterPreset")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_FILTERS.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedPreset(i)}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-xl border text-sm font-medium transition-all text-start",
                      selectedPreset === i
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/60 hover:bg-muted/50"
                    )}
                  >
                    <span style={{ color: preset.color }}>
                      {ICON_MAP[preset.icon]}
                    </span>
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{tc("cancel")}</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {tc("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
