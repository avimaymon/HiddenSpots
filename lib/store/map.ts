"use client";

import { create } from "zustand";

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

interface MapStore {
  viewState: MapViewState;
  selectedLocationId: string | null;
  isAddingLocation: boolean;
  pendingCoords: { lat: number; lng: number } | null;
  activeCollectionIds: string[];
  showClusters: boolean;
  setViewState: (vs: MapViewState) => void;
  setSelectedLocation: (id: string | null) => void;
  startAddingLocation: (coords?: { lat: number; lng: number }) => void;
  cancelAddingLocation: () => void;
  toggleCollection: (id: string) => void;
  setActiveCollectionIds: (ids: string[]) => void;
  setShowClusters: (v: boolean) => void;
}

export const useMapStore = create<MapStore>((set) => ({
  viewState: { longitude: 35.2137, latitude: 31.7683, zoom: 7 },
  selectedLocationId: null,
  isAddingLocation: false,
  pendingCoords: null,
  activeCollectionIds: [],
  showClusters: true,
  setViewState: (viewState) => set({ viewState }),
  setSelectedLocation: (selectedLocationId) => set({ selectedLocationId }),
  startAddingLocation: (coords) =>
    set({ isAddingLocation: true, pendingCoords: coords ?? null }),
  cancelAddingLocation: () =>
    set({ isAddingLocation: false, pendingCoords: null }),
  toggleCollection: (id) =>
    set((s) => ({
      activeCollectionIds: s.activeCollectionIds.includes(id)
        ? s.activeCollectionIds.filter((c) => c !== id)
        : [...s.activeCollectionIds, id],
    })),
  setActiveCollectionIds: (activeCollectionIds) => set({ activeCollectionIds }),
  setShowClusters: (showClusters) => set({ showClusters }),
}));
