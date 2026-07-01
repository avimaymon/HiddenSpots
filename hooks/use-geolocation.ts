"use client";

import { useState, useEffect, useCallback } from "react";
import { getDistanceBetween, formatDistance } from "@/lib/utils";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation(enabled = true) {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    loading: enabled,
    error: null,
  });

  const refresh = useCallback(() => {
    if (!enabled || !navigator.geolocation) {
      setState((s) => ({ ...s, loading: false, error: "Geolocation unavailable" }));
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          loading: false,
          error: null,
        });
      },
      (err) => {
        setState({
          latitude: null,
          longitude: null,
          loading: false,
          error: err.message,
        });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, [enabled]);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);

  const distanceTo = useCallback(
    (lat: number, lng: number): string | null => {
      if (state.latitude == null || state.longitude == null) return null;
      const m = getDistanceBetween(state.latitude, state.longitude, lat, lng);
      return formatDistance(m);
    },
    [state.latitude, state.longitude]
  );

  return { ...state, refresh, distanceTo };
}
