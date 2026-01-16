// sw.js — CORMACH Configuratore (cache semplice)
// Cambia versione quando aggiorni file (v1, v2, v3...)
const CACHE = "cormach-config-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./data/products.json",
  "./data/accessori.json"
];

// Install: cache asset base
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: pulizia cache vecchie
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first per asset locali, network fallback
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((resp) => {
          // salviamo in cache solo risposte valide e same-origin
          const url = new URL(req.url);
          if (resp && resp.status === 200 && url.origin === self.location.origin) {
            const copy = resp.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return resp;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
