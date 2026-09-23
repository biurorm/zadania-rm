// Service Worker, dzialanie offline
// Strategia: najpierw siec (nowa wersja wchodzi od razu), bez zasiegu cache.
// Tylko pliki aplikacji z tej samej domeny; zapytania do bazy (Supabase) omijaja cache.
const CACHE = 'zadania-rm-v7';
const FILES = ['./', './index.html', './style.css', './app.js', './config.js', './vendor/supabase.js', './manifest.json', './logo.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request).then(resp => {
      const clone = resp.clone();
      caches.open(CACHE).then(c => { try { c.put(event.request, clone); } catch (e) {} });
      return resp;
    }).catch(() => caches.match(event.request, { ignoreSearch: true }).then(c => c || caches.match('./index.html')))
  );
});
