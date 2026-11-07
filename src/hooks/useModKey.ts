"use client";
import { useEffect, useState } from "react";

/** "⌘" on Apple devices, "Ctrl" elsewhere. Starts as "Ctrl" so server and client markup match. */
export function useModKey(): string {
  const [mod, setMod] = useState("Ctrl");
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.userAgent)) setMod("⌘");
  }, []);
  return mod;
}
