// ==========================================
// SERVICE WORKER - PWA Zakat Masjid Al Ikhlas
// ==========================================
// Tugasnya: cache "kerangka" app (HTML/CSS/JS/ikon) supaya app
// terbuka instan & bisa dipasang seperti aplikasi native.
//
// PENTING: data zakat (dari AppScript) TIDAK di-cache.
// Data selalu diambil live dari jaringan supaya angka selalu terbaru.

// Naikkan angka versi ini setiap kali Anda mengubah file app.
// Contoh: 'zakat-v1' -> 'zakat-v2'. Ini memaksa HP mengambil versi baru.
const CACHE_NAME = 'zakat-v2';

// Daftar "kerangka" yang disimpan untuk dibuka cepat / offline.
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. INSTALL: simpan app shell ke cache
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// 2. ACTIVATE: bersihkan cache versi lama
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// 3. FETCH: atur cara melayani permintaan
self.addEventListener('fetch', function(event) {
  var req = event.request;

  // Hanya tangani GET. Permintaan POST (fetch ke AppScript) dibiarkan
  // lewat langsung ke jaringan tanpa disentuh service worker.
  if (req.method !== 'GET') {
    return;
  }

  var url = new URL(req.url);

  // Permintaan ke luar origin kita (AppScript, CDN SweetAlert/FontAwesome,
  // Google Fonts) selalu ambil dari jaringan langsung. Jangan di-cache paksa.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Untuk file app sendiri: coba cache dulu (cepat), kalau tak ada ambil jaringan.
  event.respondWith(
    caches.match(req).then(function(cached) {
      if (cached) return cached;

      return fetch(req).then(function(res) {
        // Simpan salinan file app yang baru diambil ke cache
        var salinan = res.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(req, salinan);
        });
        return res;
      }).catch(function() {
        // Kalau offline dan yang diminta halaman, sajikan index dari cache
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
