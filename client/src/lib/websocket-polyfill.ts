/**
 * Utility per risolvere i problemi di connessione WebSocket
 * 
 * Questo file fornisce funzioni utili per gestire le connessioni WebSocket
 * in modo affidabile.
 */

/**
 * Crea un URL WebSocket valido per l'applicazione
 * @returns Un URL valido per la connessione WebSocket
 */
export function getValidWebSocketUrl(): string {
  if (typeof window === 'undefined') {
    return ''; // Per ambienti non browser
  }
  
  // Crea sempre un URL valido basato sull'host corrente
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host || '';
  
  // Verifica che l'host non sia vuoto o contenga "undefined"
  if (!host || host.includes('undefined')) {
    console.error('Invalid host in WebSocket URL construction:', host);
    
    // Usa un fallback se siamo in ambiente Replit (basato sull'URL del documento)
    if (typeof document !== 'undefined' && document.location.href) {
      const url = new URL(document.location.href);
      const fallbackHost = url.host;
      if (fallbackHost && !fallbackHost.includes('undefined')) {
        console.log('Using fallback host for WebSocket:', fallbackHost);
        return `${protocol}//${fallbackHost}/ws`;
      }
    }
    
    // Se tutto fallisce, usa l'URL completo di window.location
    return `${protocol}//${window.location.hostname}/ws`;
  }
  
  return `${protocol}//${host}/ws`;
}

/**
 * Verifica se l'URL di un WebSocket è valido
 * @param url L'URL da verificare
 * @returns true se l'URL è valido, false altrimenti
 */
export function isValidWebSocketUrl(url: string): boolean {
  if (!url) return false;
  
  // Controlla se l'URL ha problemi comuni
  return !(
    url.includes('localhost:undefined') ||
    url.includes('undefined') ||
    url === 'ws://' ||
    url === 'wss://' ||
    url.endsWith('://')
  );
}

/**
 * Crea una WebSocket con gestione degli errori potenziata
 * @returns Un oggetto WebSocket o null in caso di errore
 */
export function createSafeWebSocket(): WebSocket | null {
  try {
    const url = getValidWebSocketUrl();
    
    // Verifica che l'URL sia valido prima di creare la WebSocket
    if (!isValidWebSocketUrl(url)) {
      console.error('Invalid WebSocket URL detected:', url);
      
      // Tentativo di costruire un URL più affidabile basato sull'URL corrente
      const currentUrl = document.location.href;
      const urlObj = new URL(currentUrl);
      const protocol = urlObj.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = urlObj.host;
      const fallbackUrl = `${protocol}//${host}/ws`;
      
      if (isValidWebSocketUrl(fallbackUrl)) {
        console.log('Using fallback WebSocket URL:', fallbackUrl);
        return new WebSocket(fallbackUrl);
      } else {
        console.error('Could not create a valid WebSocket URL');
        return null;
      }
    }
    
    console.log('Creating safe WebSocket connection to:', url);
    return new WebSocket(url);
  } catch (error) {
    console.error('Failed to create WebSocket connection:', error);
    return null;
  }
}

/**
 * Ottiene un URL WebSocket valido per Vite HMR
 * Funzione di utility per aiutare con gli URL HMR problematici
 */
export function getViteHmrUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  
  // Crea un URL HMR che funzionerà più affidabilmente
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}`;
}

// Esporta le funzioni di utility
export default {
  getValidWebSocketUrl,
  isValidWebSocketUrl,
  createSafeWebSocket,
  getViteHmrUrl
};