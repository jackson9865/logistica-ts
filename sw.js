const CACHE_NAME = 'js-logistics-v3.0.0';
const ASSETS = [
  'index.html',
  'style_v16.css',
  'app.js',
  'manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // ESTRATÉGIA: NETWORK FIRST (Sempre tenta a internet primeiro para garantir que o Jackson veja o código novo)
  if (event.request.mode === 'navigate' || event.request.url.includes('app.js') || event.request.url.includes('index.html')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
