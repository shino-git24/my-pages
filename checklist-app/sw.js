// キャッシュの名前は固定でOK
const CACHE_NAME = 'checklist-cache-final';
const urlsToCache = [
  '.',
  'index.html',
  'style.css',
  'script.js',
  'items.json',
  'manifest.json',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

// インストール時に、基本的なファイル（アプケーションの骨格）をキャッシュする
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// activateイベントでは、古いキャッシュを削除する（念のため残しておく）
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
    .then(() => self.clients.claim())
  );
});

// ★★★ リクエストの処理方法を「Network First」に変更 ★★★
self.addEventListener('fetch', event => {
  // items.jsonは常にネットワークから最新を取得しようと試みる
  if (event.request.url.includes('items.json')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // その他のリクエストは「Network First, falling back to Cache」戦略
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // ネットワークから取得できたら、キャッシュを更新してレスポンスを返す
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // ネットワークに失敗した場合（オフラインなど）、キャッシュから返す
        return caches.match(event.request);
      })
  );
});