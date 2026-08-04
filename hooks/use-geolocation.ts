"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocale } from "next-intl";
import { getDistanceBetween, formatDistance } from "@/lib/utils";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  denied: boolean;
  error: string | null;
}

export function useGeolocation(enabled = true) {
  const locale = useLocale();
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: enabled,
    denied: false,
    error: null,
  });

  const watchIdRef = useRef<number | null>(null);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const refresh = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, loading: false, error: "Geolocation unavailable", denied: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          loading: false,
          denied: false,
          error: null,
        });
      },
      (err) => {
        const denied = err.code === GeolocationPositionError.PERMISSION_DENIED;
        setState({
          latitude: null,
          longitude: null,
          accuracy: null,
          loading: false,
          denied,
          error: err.message,
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  /** Watch position continuously — call stopWatch() to cancel */
  const startWatch = useCallback(() => {
    if (!navigator.geolocation || watchIdRef.current !== null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          loading: false,
          denied: false,
          error: null,
        });
      },
      (err) => {
        const denied = err.code === GeolocationPositionError.PERMISSION_DENIED;
        setState((s) => ({ ...s, loading: false, denied, error: err.message }));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
    );
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (enabled) refresh();
    return stopWatch;
  }, [enabled, refresh, stopWatch]);

  const distanceTo = useCallback(
    (lat: number, lng: number): string | null => {
      if (state.latitude == null || state.longitude == null) return null;
      const m = getDistanceBetween(state.latitude, state.longitude, lat, lng);
      return formatDistance(m, locale);
    },
    [state.latitude, state.longitude, locale]
  );

  return { ...state, refresh, startWatch, stopWatch, distanceTo };
}
