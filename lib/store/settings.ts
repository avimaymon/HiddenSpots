"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MapProvider = "mapbox" | "google" | "leaflet";

interface SettingsStore {
  mapProvider: MapProvider;
  mapStyle: string;
  setMapProvider: (p: MapProvider) => void;
  setMapStyle: (s: string) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      mapProvider: "mapbox",
      mapStyle: "outdoors-v12",
      setMapProvider: (mapProvider) => set({ mapProvider }),
      setMapStyle: (mapStyle) => set({ mapStyle }),
    }),
    { name: "hiddenspots-settings" }
  )
);
