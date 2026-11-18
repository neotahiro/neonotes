"use client";
import { useEffect } from "react";

/** Turns on offline support. It does nothing while developing, so it never gets in the way there. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      /* offline support is optional; the app works without it */
    });
  }, []);
  return null;
}
