const CACHE = 'gt-now-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './data.js',
  './hours.js',
  './shuttle.js',
  './libraries.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first: always try the live server before ever falling back to a
// cached copy. A cache-first strategy would serve whatever was cached
// immediately and only refresh quietly in the background for the *next*
// load — which means a stuck or sticky cache (installed-to-homescreen iOS
// apps in particular) can serve stale content forever with no way to
// self-correct. Cache is purely an offline fallback here.
//
// IMPORTANT: bump CACHE's version string on every single deploy. That's
// what forces every previously-installed copy of this app to actually fetch
// fresh files instead of serving its old cached ones.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) caches.open(CACHE).then((cache) => cache.put(event.request, res.clone()));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
