// 7Cards Games by Syam - v1.6.0; network-first prevents stale versions after CI/CD.
const CACHE = '7cards-syam-v1.6.0';
const ASSETS = ['./','./index.html','./styles.css?v=1.6.0','./app.js?v=1.6.0','./favicon.svg','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  // Always try the newest code, HTML and styling. Offline fallback comes from cache.
  const url = new URL(request.url);
  const codeAsset = request.mode === 'navigate' || /\.(html|css|js)$/.test(url.pathname) || url.pathname === '/';
  if(codeAsset){
    event.respondWith(fetch(request).then(response => {
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(c => c.put(request,copy));}
      return response;
    }).catch(() => caches.match(request).then(x => x || caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(c => c.put(request,copy));}
    return response;
  })));
});
