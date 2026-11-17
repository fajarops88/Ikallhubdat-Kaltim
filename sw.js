/* Service Worker — SIM IKALLHUBDAT Kaltim
   • Aset statis: tampil instan dari cache, diperbarui di latar (stale-while-revalidate)
   • Halaman, config.js & versi.json: selalu dicek ke server (perubahan langsung terlihat setelah push)
   • API Apps Script & gambar Drive: TIDAK pernah dicache oleh service worker
   • Cache "ikh-galeri-…" (foto galeri yang sudah dimuat, diisi oleh publik.js) TIDAK dihapus saat versi berganti
   VERSI & ?v= di bawah disetel otomatis oleh skrip build (sama dengan versi.json & core.js) */
const VERSI = 'ikh-v1.8.0';
const SHELL = ['./', './index.html', './css/style.css?v=1.8.0', './js/config.js?v=1.8.0', './js/core.js?v=1.8.0', './js/publik.js?v=1.8.0',
  './manifest.json', './img/logo.png', './img/favicon.png', './img/icon-192.png', './img/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSI).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSI && k.indexOf('ikh-galeri') !== 0).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
/* Jaringan dulu. mode 'no-cache' = tanya server apakah berkas berubah (murah, ±304),
   sehingga cache HTTP ±10 menit GitHub Pages tidak menahan versi lama. */
function jaringanDulu(req, mode, cadangan) {
  const baru = req.mode === 'navigate' ? new Request(req, { cache: mode }) : new Request(req.url, { cache: mode, credentials: 'same-origin' });
  return fetch(baru).then((res) => {
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
  if (req.mode === 'navigate') { e.respondWith(jaringanDulu(req, 'no-cache', './index.html')); return; }
  if (url.origin === self.location.origin) {
    if (/\/versi\.json$/.test(url.pathname)) return;                                   // cek versi: langsung ke server, tidak dicache
    if (/\/js\/config\.js$/.test(url.pathname)) { e.respondWith(jaringanDulu(req, 'no-store')); return; }
    e.respondWith(cacheDulu(req)); return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || /cdn\.jsdelivr\.net$|unpkg\.com$/.test(url.hostname)) { e.respondWith(cacheDulu(req)); }
});
