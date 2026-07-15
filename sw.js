const CACHE_NAME = 'blockflow-v16';
const urlsToCache = [
    './',
    'index.html',
    'calendar.html',
    'settings.html',
    'materials.html',
    'css/style.css',
    'js/app.js',
    'js/storage.js',
    'js/timer.js',
    'js/ui.js',
    'js/calendar.js',
    'js/ai-assistant.js',
    'js/materials.js',
    'js/notifications.js',
    'js/nova/nova-stt-providers.js',
    'js/nova/nova-tts-providers.js',
    'js/nova/nova-settings.js',
    'js/nova/nova-waveform.js',
    'js/google-calendar.js',
    'js/sync-engine.js',
    'js/firebase-init.js',
    'js/firebase-auth.js',
    'js/firebase-db.js',
    'js/nvidia-config.js',
    'manifest.json',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/icon-192.svg'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
});

// Helper: Check if a URL scheme is cacheable
function isCacheableScheme(url) {
    try {
        const urlObj = new URL(url);
        // Only cache http and https requests
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Skip non-GET requests and API/external fetch calls (avoid CORS errors in SW)
    if (request.method !== 'GET' || request.url.includes('nvidia.com') || request.url.includes('corsproxy')) {
        return;
    }

    // Skip requests with unsupported schemes (chrome-extension, data, etc.)
    if (!isCacheableScheme(request.url)) {
        return;
    }

    // For navigation requests (HTML pages), use network-first strategy
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request, { cache: 'no-cache' })
                .then((response) => {
                    if (response.ok && isCacheableScheme(request.url)) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, clone).catch(() => {});
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request);
                })
        );
        return;
    }

    // For JS files, use network-first (always serve fresh when online)
    if (request.url.match(/\.js(\?|$)/)) {
        event.respondWith(
            fetch(request, { cache: 'no-cache' })
                .then((response) => {
                    if (response.ok && isCacheableScheme(request.url)) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, clone).catch(() => {});
                        });
                    }
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // For other static assets, use cache-first with network update
    event.respondWith(
        caches.match(request)
            .then((response) => {
                if (response) {
                    if (isCacheableScheme(request.url)) {
                        fetch(request).then((networkResponse) => {
                            if (networkResponse && networkResponse.ok) {
                                caches.open(CACHE_NAME).then((cache) => {
                                    cache.put(request, networkResponse).catch(() => {});
                                });
                            }
                        }).catch(() => {});
                    }
                    return response;
                }
                return fetch(request);
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});
