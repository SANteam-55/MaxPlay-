// MaxPlay PWA Service Worker for Zero-Network Offline App Shell
const CACHE_NAME = 'maxplay-pwa-v6';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/logo.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Skip Vite dev server modules, API routes, proxy routes, Firebase auth, and video streams
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.startsWith('/@id/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/proxy/') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('securetoken') ||
    url.hostname.includes('test-streams') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.m3u8') ||
    url.pathname.endsWith('.m4s') ||
    url.protocol.startsWith('blob:')
  ) {
    return;
  }

  // 1. Navigation requests (HTML Documents / App Shell)
  // Network First -> Save to Cache -> Fallback to Cache when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy1 = networkResponse.clone();
            const copy2 = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy1);
              cache.put('/index.html', copy2);
              cache.put('/', networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedReq = await caches.match(request);
          if (cachedReq) return cachedReq;

          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;

          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;

          const cache = await caches.open(CACHE_NAME);
          const keys = await cache.keys();
          const htmlKey = keys.find(k => k.url.includes('.html') || k.url.endsWith('/'));
          if (htmlKey) return cache.match(htmlKey);

          return new Response(
            '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>MaxPlay Offline</title></head><body style="background:#0A0A0A;color:#fff;font-family:sans-serif;text-align:center;padding:40px;"><h1>MaxPlay Offline Vault</h1><p>Please connect to internet or check Downloads screen.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 2. Static Resources (JS, CSS, Images, Fonts, JSON)
  // Network First -> Update Cache -> Fallback to Cache when offline
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (networkResponse.type === 'basic' || networkResponse.type === 'cors')
        ) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        throw new Error('Network and cache both unavailable');
      })
  );
});
