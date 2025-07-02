const CACHE_NAME = 'checklist-cache-v1';
// �L���b�V������t�@�C���̃��X�g
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

// �C���X�g�[������
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// ���N�G�X�g���������ꍇ�ɁA�L���b�V���܂��̓l�b�g���[�N����Ԃ�
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // �L���b�V�����������炻���Ԃ�
        if (response) {
          return response;
        }
        // �L���b�V�����Ȃ�������l�b�g���[�N�Ɏ��ɍs��
        return fetch(event.request);
      }
    )
  );
});

// �Â��L���b�V�����폜����
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