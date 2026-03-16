const CACHE = 'homeschool-lms-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json?v=4',
  './parent-dashboard/index.html',
  './css/app.css?v=3',
  './js/app.js?v=3',
  './js/world.js?v=3',
  './data/curriculum.js?v=3',
  './lib/three.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const requestUrl = new URL(e.request.url);
  const isNavigation = e.request.mode === 'navigate';
  const isSameOrigin = requestUrl.origin === self.location.origin;

  if (isNavigation) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(requestUrl.pathname, copy));
          return response;
        })
        .catch(() => caches.match(requestUrl.pathname).then(match => match || caches.match('./index.html')))
    );
    return;
  }

  if (!isSameOrigin) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, copy));
        return response;
      });
    })
  );
});
