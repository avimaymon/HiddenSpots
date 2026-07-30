"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { updateCategoryAppearance } from "@/lib/actions/collections";
import { Tag } from "lucide-react";

type Category = { id: string; name: string; color: string; icon: string; isSystem: boolean };

const PRESET_COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#84cc16", "#6366f1",
];

const PRESET_ICONS = ["map-pin", "mountain", "tree", "waves", "sun", "moon", "camera", "coffee", "tent", "compass"];

export function CategorySettingsSection({ categories }: { categories: Category[] }) {
  const [cats, setCats] = useState(categories.filter((c) => !c.isSystem));
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ color: string; icon: string }>({ color: "", icon: "" });
  const [isPending, startTransition] = useTransition();

  function startEdit(cat: Category) {
    setEditing(cat.id);
    setDraft({ color: cat.color, icon: cat.icon });
  }

  function handleSave(id: string) {
    startTransition(async () => {
      try {
        await updateCategoryAppearance(id, draft);
        setCats((prev) => prev.map((c) => c.id === id ? { ...c, ...draft } : c));
        setEditing(null);
        toast({ title: "Category updated", variant: "success" });
      } catch {
        toast({ title: "Failed to update", variant: "destructive" });
      }
    });
  }

  if (cats.length === 0) return (
    <div className="text-sm text-muted-foreground">No custom categories yet. Create some in the Add Spot dialog.</div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 font-bold text-sm">
        <Tag className="h-4 w-4 text-primary" /> Category Appearance
      </div>
      <div className="space-y-2">
        {cats.map((cat) => (
          <div key={cat.id} className="border border-border/50 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: cat.color }}>
                {cat.name.charAt(0)}
              </div>
              <span className="font-medium text-sm">{cat.name}</span>
              <div className="flex-1" />
              {editing === cat.id ? (
                <Button size="sm" className="h-7 text-xs rounded-lg" onClick={() => handleSave(cat.id)} disabled={isPending}>
                  Save
                </Button>
              ) : (
                <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg" onClick={() => startEdit(cat)}>
                  Edit
                </Button>
              )}
            </div>
            {editing === cat.id && (
              <div className="space-y-3 pt-1">
                <div>
                  <Label className="text-xs">Color</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setDraft((d) => ({ ...d, color: c }))}
                        className="h-6 w-6 rounded-md ring-offset-1 transition-all"
                        style={{ background: c, outline: draft.color === c ? `2px solid ${c}` : "none" }}
                      />
                    ))}
                    <input
                      type="color"
                      value={draft.color}
                      onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
                      className="h-6 w-6 rounded-md cursor-pointer border-0 p-0 bg-transparent"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Icon</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {PRESET_ICONS.map((ic) => (
                      <button
                        key={ic}
                        onClick={() => setDraft((d) => ({ ...d, icon: ic }))}
                        className={`px-2 py-0.5 rounded-md text-xs border transition-all ${draft.icon === ic ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
