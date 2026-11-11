// DIG Ledger offline support.
// App files are cached on install; the text-reading engine and fonts are cached the first time they load.
const VERSION = 'dig-ledger-v27';
const APP_FILES = [
  './',
  './index.html',
  './matcher.js',
  './schedule.js',
  './schedule.csv',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon.png',
];
const RUNTIME_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com', 'tessdata.projectnaptha.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== 'dig-ledger-runtime').map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App files: network first so updates arrive, cache when offline.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  // Engine and font files are versioned and never change: cache first.
  if (RUNTIME_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open('dig-ledger-runtime').then((c) =>
        c.match(req).then((hit) => hit || fetch(req).then((res) => {
          if (res.ok || res.type === 'opaque') c.put(req, res.clone());
          return res;
        }))
      )
    );
  }
});
