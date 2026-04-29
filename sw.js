const CACHE_NAME = 'js-logistics-v1.8.5';
const ASSETS = [
  'index.html',
  'style_v15.css',
  'app_v185.js',
  'manifest.json',
  'icon.png',
  'logistics_app_bg.png'
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
        keys.map(key => caches.delete(key)) // Delete ALL old caches
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Always try network first for the app logic
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
