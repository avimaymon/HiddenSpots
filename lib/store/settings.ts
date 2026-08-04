"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MapProvider = "mapbox" | "google" | "leaflet";

interface SettingsStore {
  mapProvider: MapProvider;
  mapStyle: string;
  /** Outdoor field density: sun contrast + larger check-in + nearby bias. */
  trailDay: boolean;
  setMapProvider: (p: MapProvider) => void;
  setMapStyle: (s: string) => void;
  setTrailDay: (on: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      mapProvider: "mapbox",
      mapStyle: "outdoors-v12",
      trailDay: false,
      setMapProvider: (mapProvider) => set({ mapProvider }),
      setMapStyle: (mapStyle) => set({ mapStyle }),
      setTrailDay: (trailDay) => set({ trailDay }),
    }),
    { name: "hiddenspots-settings" }
  )
);
