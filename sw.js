const CACHE_NAME = 'js-shortcut-v1';
const ASSETS = [
  'index.html',
  'manifest.json',
  'icon.png'
];

// 安裝並快取檔案
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 攔截請求，優先使用快取
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
