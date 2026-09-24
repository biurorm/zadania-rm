// Service Worker, dzialanie offline
// Strategia: najpierw siec (nowa wersja wchodzi od razu), bez zasiegu cache.
// Tylko pliki aplikacji z tej samej domeny; zapytania do bazy (Supabase) omijaja cache.
const CACHE = 'zadania-rm-v13';
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
    fetch(event.request, { cache: 'no-cache' }).then(resp => {
      const clone = resp.clone();
      caches.open(CACHE).then(c => { try { c.put(event.request, clone); } catch (e) {} });
      return resp;
    }).catch(() => caches.match(event.request, { ignoreSearch: true }).then(c => c || caches.match('./index.html')))
  );
});

// powiadomienia z serwera (nowe zadanie, przypomnienie, podsumowanie dnia)
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { tresc: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.tytul || 'Zadania RM', {
    body: d.tresc || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: d.tag || undefined, data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || './', self.location.href).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((okna) => {
    for (const o of okna) {
      if (o.url.startsWith(self.registration.scope)) { o.focus(); return o.navigate ? o.navigate(url) : null; }
    }
    return clients.openWindow(url);
  }));
});
