"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const APP_VERSION = "2.0.0";
const STORAGE_KEY = "hiddenspots_seen_version";

const CHANGES = [
  { emoji: "🗺️", title: "3D Terrain & Contour Lines", body: "Toggle 3D terrain and topographic contour lines on the Mapbox map." },
  { emoji: "🌅", title: "Sunrise & Moon Phase", body: "See today's sunrise, sunset, golden hour, and moon phase on every location detail." },
  { emoji: "🔍", title: "Spot Search in Command Palette", body: "Cmd+K now searches your spots in real-time, not just page navigation." },
  { emoji: "⚡", title: "Route Optimization", body: "Hit 'Optimize order' on a trip to automatically sort stops by proximity." },
  { emoji: "🏆", title: "Explorer Rank & Streaks", body: "Your dashboard now shows your Explorer Rank and consecutive visit streak." },
];

export function WhatsNewModal() {
  // Lazy init avoids calling setState inside an effect
  const [open, setOpen] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) !== APP_VERSION
  );

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, APP_VERSION);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">✨ What&apos;s New</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {CHANGES.map((c) => (
            <div key={c.title} className="flex items-start gap-3">
              <span className="text-2xl shrink-0 leading-none">{c.emoji}</span>
              <div>
                <p className="text-sm font-semibold">{c.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button className="w-full rounded-xl" onClick={dismiss}>Got it!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
