// NaijaMart Service Worker
// Handles caching, offline support, and background sync.

const CACHE_NAME = 'naijamart-v1'
const STATIC_CACHE = 'naijamart-static-v1'
const API_CACHE = 'naijamart-api-v1'

// Assets to pre-cache on install (the shell)
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

// Fetch strategy:
// - Navigation requests: network-first (fall back to cached index.html)
// - API requests: network-only (never cache sensitive data)
// - Static assets: cache-first (fast loading)
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // API requests: network only, no caching (auth, orders, etc.)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Return a simple offline message for API calls
        return new Response(JSON.stringify({ message: 'You are offline. Please check your connection.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      })
    )
    return
  }

  // Uploaded images: cache on first fetch
  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached
          return fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone())
            return response
          })
        })
      )
    )
    return
  }

  // Static assets (JS, CSS, images): cache-first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|webp|woff|woff2)$/) ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/')
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          // Return cached version, but also fetch and update in background
          const fetchPromise = fetch(request)
            .then((response) => {
              if (response.ok) cache.put(request, response.clone())
              return response
            })
            .catch(() => cached)

          return cached || fetchPromise
        })
      )
    )
    return
  }

  // Navigation: network first, fall back to cached index.html (SPA routing)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the latest index.html for offline SPA routing
          const clone = response.clone()
          caches.open(STATIC_CACHE).then((cache) => cache.put('/', clone))
          return response
        })
        .catch(() => caches.match('/').then((r) => r || caches.match('/offline.html')))
    )
    return
  }

  // Everything else: network first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  )
})

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || 'NaijaMart', {
      body: data.body || 'You have a new notification',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      data: data.url || '/',
      actions: [
        { action: 'open', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const url = event.notification.data || '/'
      // Focus existing window or open new one
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      return clients.openWindow(url)
    })
  )
})
