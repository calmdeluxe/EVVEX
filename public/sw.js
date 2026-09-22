const CACHE_NAME = 'calmreader-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png'
];

// Service Worker Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static core assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Service Worker Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Service Worker Fetch Event
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests, API endpoints, Supabase connections, dev source files, and Vite internal scripts
  if (
    request.method !== 'GET' || 
    url.pathname.startsWith('/api') || 
    url.pathname.startsWith('/src') || 
    url.pathname.startsWith('/@') || 
    url.pathname.startsWith('/node_modules') || 
    url.pathname.startsWith('/debug') || 
    url.hostname.includes('supabase') ||
    url.pathname.includes('hot-update') ||
    request.url.includes('socket') ||
    url.pathname.endsWith('.apk') ||
    url.pathname.includes('version.json')
  ) {
    return;
  }

  // Network-First with Cache Fallback Strategy
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // If we get a valid successful response from our own origin, cache/update it
        if (networkResponse && networkResponse.status === 200 && url.origin === self.location.origin) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network failed (offline): serve from cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // SPA routing fallback: serve /index.html if we are offline and navigating to a page
          if (
            request.mode === 'navigate' || 
            (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))
          ) {
            return caches.match('/index.html') || caches.match('/');
          }
        });
      })
  );
});
