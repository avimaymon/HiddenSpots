"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Search, X, MapPin, Star, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  parseHebrewQuery,
  hasNlFilters,
  matchLocationAgainstNl,
} from "@/lib/search/hebrew-nl";

type LocationRow = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  isFavorite: boolean;
  isVisited: boolean;
  isDogFriendly?: boolean | null;
  isFamilyFriendly?: boolean | null;
  isCampingAllowed?: boolean | null;
  hasParking?: boolean | null;
  hasWater?: boolean | null;
  hasShade?: boolean | null;
  category: { color: string; name: string; nameHe?: string | null } | null;
};

interface Props {
  open: boolean;
  onClose: () => void;
  locations: LocationRow[];
  onSelect: (id: string) => void;
}

export function MobileSearchScreen({ open, onClose, locations, onSelect }: Props) {
  const t = useTranslations("map");
  const tc = useTranslations("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      const id = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(id);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const nl = useMemo(() => (query.trim() ? parseHebrewQuery(query) : null), [query]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return locations.slice(0, 40);
    if (nl && hasNlFilters(nl)) {
      return locations.filter((l) => matchLocationAgainstNl(l, nl)).slice(0, 40);
    }
    const lower = q.toLowerCase();
    return locations
      .filter(
        (l) =>
          l.title.toLowerCase().includes(lower) ||
          (l.category?.name?.toLowerCase().includes(lower) ?? false)
      )
      .slice(0, 40);
  }, [query, locations, nl]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-background",
        "animate-fade-in"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-[calc(var(--safe-top)+1rem)] pb-3 border-b border-border/50">
        <div className="flex-1 flex items-center gap-2 h-11 px-3 rounded-xl bg-muted/60 border border-border/40 focus-within:ring-1 focus-within:ring-ring transition-shadow">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              aria-label={tc("cancel")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-medium text-primary shrink-0 h-11 px-1 flex items-center"
        >
          {tc("cancel")}
        </button>
      </div>

      {nl && hasNlFilters(nl) && (
        <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-border/40">
          {nl.matched.map((m) => (
            <span
              key={m}
              className="text-[11px] px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-medium"
            >
              {m}
            </span>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <Search className="h-8 w-8 opacity-30" />
            <p className="text-sm">{t("noResults")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {results.map((loc) => (
              <li key={loc.id}>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-start hover:bg-muted/40 active:bg-muted/60 transition-colors"
                  onClick={() => onSelect(loc.id)}
                >
                  {/* Category dot */}
                  <span
                    className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: loc.category?.color ? `${loc.category.color}20` : undefined }}
                  >
                    <MapPin
                      className="h-4 w-4"
                      style={{ color: loc.category?.color ?? "var(--primary)" }}
                    />
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-tight">{loc.title}</p>
                    {loc.category?.name && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{loc.category.name}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {loc.isFavorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                    {loc.isVisited && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
