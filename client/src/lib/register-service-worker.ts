/**
 * Registrazione e gestione del Service Worker
 * Questo file centralizza la logica di registrazione del service worker e fornisce funzioni di utilità
 */

// Verifica se siamo in produzione (non necessario in questo caso, ma è una buona pratica)
const isProduction = true; // In un'app reale, questo sarebbe determinato da una variabile d'ambiente

/**
 * Registra il service worker e gestisce gli aggiornamenti
 */
export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      
      console.log('Service Worker registrato con successo:', window.location.origin);
      
      // Gestione degli aggiornamenti del service worker
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('Nuovo Service Worker disponibile, l\'app verrà aggiornata alla prossima visita');
          }
        });
      });
      
      // Gestione degli errori di installazione
      if (registration.installing) {
        registration.installing.addEventListener('statechange', function(e) {
          if (this.state === 'redundant') {
            console.error('Installazione del Service Worker fallita');
          }
        });
      }
      
      // Installazione più veloce controllando immediatamente se ci sono aggiornamenti
      if (registration.active) {
        registration.update();
      }
      
      // Gestione degli eventi di comunicazione dal service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        // Gestione dei messaggi dal service worker
        console.log('Messaggio dal Service Worker:', event.data);
      });
      
    } catch (error) {
      console.error('Registrazione del Service Worker fallita:', error);
    }
  } else {
    console.warn('Service Worker non supportato in questo browser');
  }
}

/**
 * Forza l'aggiornamento del service worker
 */
export async function updateServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        console.log('Service Worker aggiornato');
      }
    } catch (error) {
      console.error('Aggiornamento del Service Worker fallito:', error);
    }
  }
}

// Controlla se è necessario svuotare la cache quando cambia la versione dell'app
export function checkCacheVersion(): void {
  const currentVersion = '1.0.0'; // Dovrebbe essere sincronizzato con la versione dell'app
  const lastVersion = localStorage.getItem('app_version');
  
  if (lastVersion !== currentVersion) {
    // Versione cambiata, svuota le cache
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName);
        });
      });
    }
    
    // Aggiorna la versione memorizzata
    localStorage.setItem('app_version', currentVersion);
  }
}

// Invia un messaggio al service worker
export function sendMessageToServiceWorker(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
      reject(new Error('Service Worker non attivo'));
      return;
    }
    
    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };
    
    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
  });
}

// Inizializza il service worker al caricamento della pagina
if (typeof window !== 'undefined') {
  registerServiceWorker();
  checkCacheVersion();
}