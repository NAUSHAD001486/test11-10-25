const CACHE_NAME = 'love-u-convert-v1.0.0';
// Exclude CSS/JS from caching - user needs instant updates (no cache as per requirement)
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
  // CSS/JS excluded - always fetch fresh from network for instant updates
];

// Install event - cache static resources
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static resources...');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Static resources cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Failed to cache static resources:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - optimized for instant updates (no CSS/JS caching)
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip API requests and file uploads
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/upload/') ||
      event.request.url.includes('cloudinary.com')) {
    return;
  }
  
  // CSS/JS always fetch from network (no cache) - user requirement for instant updates
  if (event.request.url.includes('/css/') || event.request.url.includes('/js/')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        // Only use cache as fallback if network fails completely
        return caches.match(event.request);
      })
    );
    return;
  }
  
  // Other resources: network first, cache fallback for offline
  event.respondWith(
    fetch(event.request)
      .then(function(fetchResponse) {
        // Don't cache if not a valid response
        if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
          return fetchResponse;
        }
        
        // Only cache non-CSS/JS resources (icons, manifest, etc.)
        if (isCacheableResource(event.request.url)) {
          var responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseToCache);
          });
        }
        
        return fetchResponse;
      })
      .catch(function(error) {
        // Fallback to cache only for offline support
        return caches.match(event.request).then(function(response) {
          if (response) {
            return response;
          }
          
          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          
          // Return a generic offline response
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// Helper function to determine if a resource should be cached (CSS/JS excluded for instant updates)
function isCacheableResource(url) {
  // Only cache icons, manifest, and other non-CSS/JS static files
  // CSS/JS excluded - always fetch fresh for instant updates
  return (url.includes('.png') ||
         url.includes('.jpg') ||
         url.includes('.jpeg') ||
         url.includes('.gif') ||
         url.includes('.svg') ||
         url.includes('.ico') ||
         url.includes('manifest.json') ||
         url.includes('/icons/')) &&
         !url.includes('.css') &&
         !url.includes('.js');
}

// Background sync for failed uploads (if supported)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    // Handle background sync for failed uploads
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  // This would handle retrying failed uploads when connection is restored
  console.log('Handling background sync...');
}

// Push notifications (if needed in the future)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: 'Open App',
          icon: '/icons/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icons/icon-192x192.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handler for communication with main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'content-sync') {
    event.waitUntil(doPeriodicSync());
  }
});

async function doPeriodicSync() {
  // This would handle periodic updates when the app is not active
  console.log('Periodic sync triggered');
}
