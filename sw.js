const CACHE_NAME = 'nexo-ops-v1.0';
const ASSETS = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/config.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/router.js',
  '/js/utils.js',
  '/js/pages/login.js',
  '/js/pages/home.js',
  '/js/pages/checkin.js',
  '/js/pages/pessoal.js',
  '/js/pages/ruptura.js',
  '/js/pages/quebra.js',
  '/js/pages/temperatura.js',
  '/js/pages/dashboard.js',
  '/js/pages/ocorrencias.js',
  '/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('script.google.com')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetched = fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetched;
    })
  );
});
