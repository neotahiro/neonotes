/* NeoNotes offline support.
 *
 * - The app's own files (scripts, styles, fonts, icons) are saved the first time they load and reused afterwards.
 * - The main page is fetched from the network first. If you are offline, or the network is very slow,
 *   the last saved copy opens instead. Your notes themselves live in the browser's own storage, not here.
 * - Drive and sign-in requests are never touched: they always go to the network.
 */
"use strict";

// If you change these names, change PAGES_CACHE in src/lib/offline.ts too.
const PAGES = "neonotes-pages-v1";
const ASSETS = "neonotes-assets-v1";
const MAX_ASSETS = 300;
const NETWORK_WAIT_MS = 3500;

const OFFLINE_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>NeoNotes is offline</title>
<style>body{font-family:system-ui,sans-serif;background:#14181d;color:#dde2e8;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px;text-align:center}
p{color:#8a94a2;max-width:22rem;line-height:1.5}button{background:#22d3ee;color:#14181d;border:0;border-radius:8px;padding:10px 18px;font-size:16px;font-weight:600}</style></head>
<body><main><h1>You’re offline</h1><p>NeoNotes hasn’t been opened on this device with a connection yet, so there is nothing saved to show. Connect once, open the app, and it will work offline from then on.</p>
<button onclick="location.reload()">Try again</button></main></body></html>`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [PAGES, ASSETS];
      for (const key of await caches.keys()) {
        if (!keep.includes(key)) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

function isAppFile(pathname) {
  return pathname.startsWith("/_next/static/") || pathname.startsWith("/icons/") || pathname === "/manifest.webmanifest";
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(handlePage(event, request, url));
  } else if (isAppFile(url.pathname)) {
    event.respondWith(handleAppFile(request));
  }
});

function offlineResponse() {
  return new Response(OFFLINE_PAGE, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function isSavablePage(response) {
  return response.ok && !response.redirected && (response.headers.get("content-type") || "").includes("text/html");
}

async function handlePage(event, request, url) {
  const isHome = url.pathname === "/";
  const cache = await caches.open(PAGES);

  const fromNetwork = fetch(request).then(async (response) => {
    if (isHome && isSavablePage(response)) await cache.put("/", response.clone());
    return response;
  });

  const saved = isHome ? await cache.match("/") : undefined;
  if (!saved) return fromNetwork.catch(() => offlineResponse());

  // Keep the worker alive so the fresh copy can finish saving even if the saved one was shown first.
  event.waitUntil(fromNetwork.catch(() => undefined));
  const giveUp = new Promise((resolve) => setTimeout(() => resolve(null), NETWORK_WAIT_MS));
  try {
    return (await Promise.race([fromNetwork, giveUp])) || saved;
  } catch {
    return saved;
  }
}

async function handleAppFile(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    const keys = await cache.keys();
    for (const old of keys.slice(0, Math.max(0, keys.length - MAX_ASSETS))) await cache.delete(old);
  }
  return response;
}
