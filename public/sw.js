// Service worker: lets the app open without a connection.
// - Pages: network first, the last copy seen is used when offline.
// - Next.js static files: cached forever (their names change with every release).
// Saving groups offline is handled by the page itself (IndexedDB queue).

const VERSION = "v1";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const WARM = ["/", "/gruppo/nuovo"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => Promise.all(WARM.map((u) => fetch(u, { credentials: "same-origin" }).then((r) => r.ok && !r.redirected && c.put(u, r)).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PAGES && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(ASSETS).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Keep the page for offline use, but never a redirect to the login page.
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => {
          const c = await caches.open(PAGES);
          return (
            (await c.match(url.pathname)) ||
            (await c.match("/")) ||
            new Response("Offline", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } })
          );
        }),
    );
  }
});
