"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

interface Props {
  fontSize?: string;
  theme?: string;
}

export function PreferencesApplier({ fontSize = "default", theme = "system" }: Props) {
  const { theme: clientTheme, resolvedTheme } = useTheme();
  const active = clientTheme ?? theme;

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-font-size", fontSize);

    if (active === "sun") {
      html.setAttribute("data-theme", "sun");
      html.classList.remove("dark");
      html.classList.add("light");
    } else {
      html.removeAttribute("data-theme");
      // next-themes owns light/dark classes via resolvedTheme
      if (resolvedTheme === "dark") {
        html.classList.add("dark");
        html.classList.remove("light");
      } else if (resolvedTheme === "light") {
        html.classList.add("light");
        html.classList.remove("dark");
      }
    }
  }, [fontSize, active, resolvedTheme]);

  return null;
}
