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
  return `${protocol}//${window.location.host}/ws`;
}

/**
 * Verifica se l'URL di un WebSocket è valido
 * @param url L'URL da verificare
 * @returns true se l'URL è valido, false altrimenti
 */
export function isValidWebSocketUrl(url: string): boolean {
  // Controlla se l'URL ha problemi comuni
  return !(
    url.includes('localhost:undefined') ||
    url.includes('undefined') ||
    url === 'ws://' ||
    url === 'wss://'
  );
}

/**
 * Crea una WebSocket con gestione degli errori potenziata
 * @returns Un oggetto WebSocket o null in caso di errore
 */
export function createSafeWebSocket(): WebSocket | null {
  try {
    const url = getValidWebSocketUrl();
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