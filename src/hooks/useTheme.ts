"use client";
import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";
const KEY = "noenotes-theme";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try { localStorage.setItem(KEY, next); } catch { /* storage unavailable */ }
    setTheme(next);
  }, [theme]);

  return { theme, toggle };
}
