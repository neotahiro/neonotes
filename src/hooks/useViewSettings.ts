"use client";
import { useCallback, useState } from "react";

/** How big the text looks, in percent. This changes the view only, never the note. */
export const ZOOMS = [50, 75, 90, 100, 125, 150, 200] as const;
export type Zoom = (typeof ZOOMS)[number];

export const WIDTHS = ["narrow", "wide", "full"] as const;
export type PageWidth = (typeof WIDTHS)[number];

export interface ViewSettings {
  zoom: Zoom;
  width: PageWidth;
}

const KEY = "noenotes-view";
const DEFAULTS: ViewSettings = { zoom: 100, width: "wide" };

function load(): ViewSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<ViewSettings>;
    return {
      zoom: ZOOMS.includes(raw.zoom as Zoom) ? (raw.zoom as Zoom) : DEFAULTS.zoom,
      width: WIDTHS.includes(raw.width as PageWidth) ? (raw.width as PageWidth) : DEFAULTS.width,
    };
  } catch {
    return DEFAULTS;
  }
}

/** Zoom and page width, remembered on this device. */
export function useViewSettings() {
  const [settings, setSettings] = useState<ViewSettings>(load);

  const update = useCallback((patch: Partial<ViewSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  return { ...settings, update };
}
