"use client";

import { useEffect } from "react";

export function useVisualViewport() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function update() {
      if (!vv) return;
      const keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty("--keyboard-height", `${keyboard}px`);
    }

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      document.documentElement.style.removeProperty("--keyboard-height");
    };
  }, []);
}
