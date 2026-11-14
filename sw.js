/* Service Worker — SIM IKALLHUBDAT Kaltim
   • Aset statis: tampil instan dari cache, diperbarui di latar (stale-while-revalidate)
   • config.js & halaman: jaringan dulu (perubahan GAS_URL langsung berlaku)
   • API Apps Script & gambar Drive: TIDAK pernah dicache oleh service worker */
const VERSI = 'ikh-v1.0.0';
const SHELL = ['./', './index.html', './css/style.css?v=1.0.0', './js/config.js?v=1.0.0', './js/core.js?v=1.0.0', './js/publik.js?v=1.0.0',
  './manifest.json', './img/icon-192.png', './img/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSI).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSI).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
function jaringanDulu(req, cadangan) {
  return fetch(req).then((res) => {
    if (res && res.ok) { const salin = res.clone(); caches.open(VERSI).then((c) => c.put(req, salin)); }
    return res;
  }).catch(() => caches.match(req).then((r) => r || (cadangan ? caches.match(cadangan) : Response.error())));
}
function cacheDulu(req) {
  return caches.match(req).then((hit) => {
    const ambil = fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) { const salin = res.clone(); caches.open(VERSI).then((c) => c.put(req, salin)); }
      return res;
    }).catch(() => hit);
    return hit || ambil;
  });
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/script\.google(usercontent)?\.com$/.test(url.hostname) || url.hostname === 'drive.google.com' || /googleusercontent\.com$/.test(url.hostname)) return;
  if (req.mode === 'navigate') { e.respondWith(jaringanDulu(req, './index.html')); return; }
  if (url.origin === self.location.origin) {
    if (/\/js\/config\.js$/.test(url.pathname)) { e.respondWith(jaringanDulu(req)); return; }
    e.respondWith(cacheDulu(req)); return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || /cdn\.jsdelivr\.net$|unpkg\.com$/.test(url.hostname)) { e.respondWith(cacheDulu(req)); }
});
