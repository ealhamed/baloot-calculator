const CACHE = 'baloot-v21';
const ASSETS = [
  './',
  './index.html',
  './sibeet.html',
  './manifest.json',
  './manifest-sibeet.json',
  './logo.png',
  './cards/ace.png',
  './cards/ten.png',
  './cards/king.png',
  './cards/queen.png',
  './cards/jack.png',
  './cards/nine.png',
  './cards/ard.png',
  './cards/hjack.png',
  'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp.ok && (e.request.url.startsWith(self.location.origin) || e.request.url.includes('peerjs') || e.request.url.includes('qrcode'))) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      });
    })
  );
});
