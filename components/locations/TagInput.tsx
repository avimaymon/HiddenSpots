"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { X, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

export function TagInput({ tags, onChange, suggestions = [], placeholder }: Props) {
  const t = useTranslations("locations");
  // Was a hardcoded Hebrew literal, so the English build showed Hebrew here.
  const resolvedPlaceholder = placeholder ?? t("addTagPlaceholder");
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  );

  function add(tag: string) {
    const clean = tag.toLowerCase().trim();
    if (!clean || tags.includes(clean)) return;
    onChange([...tags, clean]);
    setInput("");
    setShowSuggestions(false);
  }

  function remove(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      add(input);
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      remove(tags[tags.length - 1]);
    }
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex flex-wrap gap-1.5 items-center min-h-[2.5rem] p-1.5 rounded-xl border border-input bg-background",
          "focus-within:ring-1 focus-within:ring-ring transition-shadow"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 h-6 px-2 rounded-full bg-primary/10 text-primary text-xs font-medium"
          >
            <Hash className="h-3 w-3 opacity-60" />
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(tag); }}
              className="ms-0.5 hover:text-destructive transition-colors"
              aria-label={t("removeTag", { tag })}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={handleKey}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={tags.length === 0 ? resolvedPlaceholder : ""}
          className="flex-1 min-w-[6rem] bg-transparent text-sm outline-none placeholder:text-muted-foreground px-1"
        />
      </div>

      {showSuggestions && filtered.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-popover shadow-md p-1 space-y-0.5">
          {filtered.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); add(s); }}
              className="w-full text-start px-2 py-1.5 rounded-lg text-sm hover:bg-muted/60 flex items-center gap-1.5"
            >
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
