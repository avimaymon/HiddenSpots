"use client";

import { useState, useEffect } from "react";

export function useCompass() {
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    if (!window.DeviceOrientationEvent) return;

    function handler(e: DeviceOrientationEvent) {
      // webkitCompassHeading is iOS; alpha is Android (0=north, clockwise)
      const h =
        (e as DeviceOrientationEvent & { webkitCompassHeading?: number })
          .webkitCompassHeading ??
        (e.alpha != null ? (360 - e.alpha) % 360 : null);
      if (h != null) setHeading(h);
    }

    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, []);

  return heading;
}
