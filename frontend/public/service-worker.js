/* BMK Komet Activity Logger - Service Worker
 *
 * Strategy:
 * - Cache static app shell (HTML, CSS, JS, icons) for fast loading and offline shell.
 * - NEVER cache API responses or user data (/api/*) - always go to network.
 * - Network-first for navigation, offline.html fallback when no network + no cache.
 */

const CACHE_VERSION = 'komet-logger-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// App shell files to pre-cache
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

// Install - pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('komet-logger-') && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // NEVER cache API calls or auth - always network, no caching of user data
  if (url.pathname.startsWith('/api/')) {
    return; // Let the browser handle it normally (network)
  }

  // For navigation requests (page loads), use network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Update the cached index for offline use
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put('/index.html', clone).catch(() => {}));
          return response;
        })
        .catch(() =>
          // Try cached index first, then offline page
          caches.match('/index.html').then((cached) => cached || caches.match('/offline.html'))
        )
    );
    return;
  }

  // For static assets (JS, CSS, images, fonts): cache-first, then network
  if (
    url.origin === self.location.origin &&
    /\.(js|css|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|ico|json)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone).catch(() => {}));
            return response;
          })
          .catch(() => cached); // fall back to cache if fetch fails
      })
    );
  }
});

// Listen for skip-waiting message (for update flow)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
