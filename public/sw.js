/* Deb — the offline shell (M6 T3). One job: a dropped connection never
   shows a broken white page. Navigations try the network first; when it
   is unreachable, the honest offline page answers instead. Nothing else
   is cached — the app's data honesty lives in the app. */
const CACHE = 'deb-offline-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/offline.html'])))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/offline.html')))
  }
})
