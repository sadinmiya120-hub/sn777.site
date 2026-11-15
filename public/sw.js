const CACHE_NAME = "sn777-v63-banners";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/assets/index-C0XgLZC6-v3.css",
  "/assets/index-sn777-v13-nagad.js?v=1794689000000",
  "/assets/banners/b1.webp",
  "/assets/banners/b_1794687569963.webp",
  "/assets/banners/b2.webp",
  "/assets/banners/b3.webp",
  "/assets/banners/b4.webp"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(CORE_ASSETS.map((u) => cache.add(u)))
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip dynamic API and auth endpoints
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/__/") || url.pathname.includes("firestore")) {
    return;
  }

  // Pure Cache-First for immutable local game icons, banners, external images & CDN fonts
  if (
    url.pathname.startsWith("/assets/game-icons/") ||
    url.pathname.startsWith("/assets/banners/") ||
    url.hostname.includes("blogger.googleusercontent.com") ||
    url.hostname.includes("cdn.jsdelivr.net") ||
    url.hostname.includes("fonts.gstatic.com") ||
    url.hostname.includes("fonts.googleapis.com")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === "opaque")) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Stale-While-Revalidate for local JS/CSS static bundles
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        }).catch(() => cachedResponse);
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Stale-While-Revalidate for HTML navigation
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match("/index.html").then((cachedIndex) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", responseToCache));
            }
            return networkResponse;
          })
          .catch(() => cachedIndex);
        return cachedIndex || fetchPromise;
      })
    );
    return;
  }

  // Default network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});
