// Service Worker para Lotería Pro PWA
// Strategy: network-first for HTML (so updates are picked up immediately),
// cache-first for everything else (libraries, icons, etc.)
const CACHE_NAME = 'loteria-pro-v3';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(URLS_TO_CACHE))
      .catch((err) => console.warn('Cache install failed:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isHTML = event.request.mode === 'navigate' ||
                 url.pathname.endsWith('.html') ||
                 url.pathname.endsWith('/');

  if (isHTML) {
    // Network-first for HTML: always try the network first so updates are
    // reflected immediately. Fall back to cache when offline.
    event.respondWith(
      fetch(event.request).then((response) => {
        const respClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respClone));
        return response;
      }).catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first for assets (CDN libs, icons, etc.)
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const respClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respClone));
          }
          return response;
        });
      })
    );
  }
});
