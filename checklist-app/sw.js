// �L���b�V���̖��O�͌Œ��OK
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

// �C���X�g�[�����ɁA��{�I�ȃt�@�C���i�A�v�P�[�V�����̍��i�j���L���b�V������
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

// activate�C�x���g�ł́A�Â��L���b�V�����폜����i�O�̂��ߎc���Ă����j
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

// ������ ���N�G�X�g�̏������@���uNetwork First�v�ɕύX ������
self.addEventListener('fetch', event => {
  // items.json�͏�Ƀl�b�g���[�N����ŐV���擾���悤�Ǝ��݂�
  if (event.request.url.includes('items.json')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // ���̑��̃��N�G�X�g�́uNetwork First, falling back to Cache�v�헪
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // �l�b�g���[�N����擾�ł�����A�L���b�V�����X�V���ă��X�|���X��Ԃ�
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // �l�b�g���[�N�Ɏ��s�����ꍇ�i�I�t���C���Ȃǁj�A�L���b�V������Ԃ�
        return caches.match(event.request);
      })
  );
});