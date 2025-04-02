// Nome della cache
const CACHE_NAME = 'barbershop-pwa-v2';
const ASSETS_CACHE = 'barbershop-assets-v2';
const API_CACHE = 'barbershop-api-v2';

// Risorse da mettere in cache per funzionamento offline
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Lista dei percorsi che dovrebbero restituire index.html (per il client routing)
const navigateFallbackPaths = [
  '/dashboard',
  '/daily',
  '/profile',
  '/services',
  '/clients',
  '/settings',
  '/chat',
  '/statistics',
  '/schedule',
  '/employees',
  '/barbers',
  '/admin'
];

// Installazione del Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installazione');
  
  // Attiva il nuovo service worker immediatamente sostituendo il vecchio
  self.skipWaiting();
  
  event.waitUntil(
    Promise.all([
      // Cache per le risorse di app
      caches.open(CACHE_NAME)
        .then((cache) => {
          console.log('[Service Worker] Caching delle risorse principali');
          return cache.addAll(urlsToCache);
        }),
      // Cache per le risorse statiche
      caches.open(ASSETS_CACHE)
        .then((cache) => {
          // Cerca e aggiungi tutte le risorse statiche dopo il caricamento dell'app
          return fetch('/')
            .then(response => response.text())
            .then(html => {
              // Estrai i percorsi delle risorse JS/CSS
              const matches = html.match(/src="([^"]+\.js)"|href="([^"]+\.css)"/g) || [];
              const urls = matches
                .map(match => match.match(/src="([^"]+)"|href="([^"]+)"/)[0].replace(/src="|href="|"/g, ''))
                .filter(url => !url.startsWith('http')); // Solo risorse locali
              
              console.log('[Service Worker] Caching delle risorse assets', urls);
              return cache.addAll(urls);
            });
        })
    ])
  );
});

// Attivazione del Service Worker e pulizia delle vecchie cache
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Attivazione');
  
  // Prendi il controllo di tutte le pagine aperte subito
  self.clients.claim();
  
  const cacheWhitelist = [CACHE_NAME, ASSETS_CACHE, API_CACHE];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[Service Worker] Eliminazione cache obsoleta:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Funzione per determinare se richiesta è una navigazione
function isNavigationRequest(request) {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' &&
      request.headers.get('accept').includes('text/html'))
  );
}

// Funzione per verificare se un URL è una richiesta API
function isApiRequest(url) {
  return url.includes('/api/');
}

// Funzione per determinare se un percorso dovrebbe reindirizzare a index.html
function shouldServeIndexHtml(url) {
  const path = new URL(url).pathname;
  return navigateFallbackPaths.some(navPath => {
    return path === navPath || path.startsWith(`${navPath}/`);
  });
}

// Intercetta le richieste di rete e servi dalla cache se offline
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Ignora richieste diverse di origine
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Strategie di caching diverse in base al tipo di richiesta
  if (isNavigationRequest(request)) {
    // Per le richieste di navigazione, usa la strategia "Network first, fallback to cache"
    event.respondWith(
      fetch(request)
        .then(response => {
          // Memorizza una copia della risposta in cache
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(request, responseToCache);
            });
          return response;
        })
        .catch(() => {
          // Se offline, servi dalla cache
          return caches.match(request)
            .then(cachedResponse => {
              // Se non c'è una risposta in cache ma il percorso dovrebbe restituire index.html
              if (!cachedResponse && shouldServeIndexHtml(request.url)) {
                return caches.match('/');
              }
              
              return cachedResponse || caches.match('/');
            });
        })
    );
  } else if (isApiRequest(url.toString())) {
    // Per le richieste API, usa la strategia "Network only, no cache fallback" (gestito da IndexedDB)
    // Non interveniamo qui, lasciamo che la logica offline-storage.ts gestisca
    return;
  } else {
    // Per risorse statiche (JS, CSS, immagini), usa la strategia "Cache first, fallback to network"
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Se non in cache, recupera dalla rete
          return fetch(request)
            .then(response => {
              // Controlla se è una risposta valida
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clona la risposta
              const responseToCache = response.clone();
              
              // Memorizza in cache
              caches.open(ASSETS_CACHE)
                .then(cache => {
                  cache.put(request, responseToCache);
                });
                
              return response;
            });
        })
    );
  }
});

// Gestione notifiche push
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Azione quando si clicca sulla notifica
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// Sincronizzazione in background
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-appointments') {
    event.waitUntil(syncAppointments());
  } else if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// Funzione per sincronizzare gli appuntamenti quando si torna online
async function syncAppointments() {
  // Qui implementeremo la logica per sincronizzare gli appuntamenti salvati localmente
  // quando l'utente torna online
  console.log('Sincronizzazione appuntamenti in corso...');
}

// Funzione per sincronizzare i messaggi quando si torna online
async function syncMessages() {
  // Qui implementeremo la logica per sincronizzare i messaggi salvati localmente
  // quando l'utente torna online
  console.log('Sincronizzazione messaggi in corso...');
}