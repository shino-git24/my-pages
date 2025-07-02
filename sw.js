const CACHE_NAME = 'checklist-cache-v1';
// キャッシュするファイルのリスト
const urlsToCache = [
  '.', // index.html
  'index.html',
  'style.css',
  'script.js',
  'items.json',
  'manifest.json',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

// インストール処理
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// リクエストがあった場合に、キャッシュまたはネットワークから返す
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュがあったらそれを返す
        if (response) {
          return response;
        }
        // キャッシュがなかったらネットワークに取りに行く
        return fetch(event.request);
      }
    )
  );
});

// 古いキャッシュを削除する
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});