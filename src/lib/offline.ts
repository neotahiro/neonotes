/** Must match PAGES in public/sw.js. */
export const PAGES_CACHE = "neonotes-pages-v1";

/** Removes the saved copy of the main page. Called when you sign out, so nothing of your account stays behind. */
export function clearOfflinePages(): void {
  try {
    if (typeof caches !== "undefined") void caches.delete(PAGES_CACHE);
  } catch {
    /* nothing to clear */
  }
}
