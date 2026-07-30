"use client";

import { useEffect, useState } from "react";

/** Returns the current document direction, reactive to changes on <html dir="">. */
export function useDir(): "ltr" | "rtl" {
  const [dir, setDir] = useState<"ltr" | "rtl">("ltr");

  useEffect(() => {
    const update = () =>
      setDir(document.documentElement.dir === "rtl" ? "rtl" : "ltr");
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"] });
    return () => obs.disconnect();
  }, []);

  return dir;
}
