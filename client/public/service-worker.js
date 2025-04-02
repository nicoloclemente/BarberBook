// Nome della cache
const CACHE_NAME = 'barbershop-pwa-v1';

// Risorse da mettere in cache per funzionamento offline
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/index.css',
  '/assets/index.js'
];

// Installazione del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aperta');
        return cache.addAll(urlsToCache);
      })
  );
});

// Attivazione del Service Worker e pulizia delle vecchie cache
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercetta le richieste di rete e servi dalla cache se offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Ritorna la risorsa dalla cache se disponibile
        if (response) {
          return response;
        }
        
        // Altrimenti, recupera dalla rete
        return fetch(event.request)
          .then((response) => {
            // Verifica che la risposta sia valida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clona la risposta (la risposta è un flusso che può essere letto una sola volta)
            const responseToCache = response.clone();

            // Aggiungi la risposta alla cache per usi futuri
            caches.open(CACHE_NAME)
              .then((cache) => {
                // Non mettere in cache richieste API
                if (!event.request.url.includes('/api/')) {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          })
          .catch(() => {
            // Se la fetch fallisce (es. offline), prova a servire una pagina di fallback per le rotte principali
            if (event.request.url.includes('/dashboard') || 
                event.request.url.includes('/daily') ||
                event.request.url.includes('/profile')) {
              return caches.match('/');
            }
          });
      })
  );
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