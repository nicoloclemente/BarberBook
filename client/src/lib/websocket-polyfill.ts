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
  
  try {
    // Ottieni l'URL del documento corrente come base sicura
    const currentUrl = document.location.href;
    const documentUrl = new URL(currentUrl);
    
    // Determina il protocollo corretto (wss per https, ws per http)
    const protocol = documentUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Preferisci sempre usare l'host del documento come fonte più affidabile
    const host = documentUrl.host;
    
    // Debug: log the host value
    console.log('Debug WebSocket - URL host:', host);
    console.log('Debug WebSocket - URL protocol:', protocol);
    console.log('Debug WebSocket - Full URL:', `${protocol}//${host}/ws`);
    
    // Verifica che l'host sia valido
    if (!host || host.includes('undefined')) {
      console.error(`Host invalido nel documento: ${host}`);
      throw new Error(`Host invalido nel documento: ${host}`);
    }
    
    // Per Replit, aggiungiamo controlli specifici all'host
    if (host.includes('replit.dev') || host.includes('replit.app')) {
      // Costruisci l'URL WebSocket con un endpoint stabile per Replit
      const wsUrl = `${protocol}//${host}/ws`;
      console.log('WebSocket URL per Replit costruito correttamente:', wsUrl);
      return wsUrl;
    }
    
    // Per ambienti locali di sviluppo
    if (host.includes('localhost')) {
      // Imposta sempre la porta a quella corrente
      const port = documentUrl.port || window.location.port || '3000';
      const wsUrl = `${protocol}//localhost:${port}/ws`;
      console.log('WebSocket URL localhost costruito correttamente:', wsUrl);
      return wsUrl;
    }
    
    // Costruisci l'URL WebSocket con un endpoint stabile
    const wsUrl = `${protocol}//${host}/ws`;
    console.log('WebSocket URL costruito correttamente:', wsUrl);
    return wsUrl;
  } catch (error) {
    // Gestione fallback più robusta in caso di errori
    console.error('Errore nella costruzione dell\'URL WebSocket:', error);
    
    // Tenta un ultimo approccio con window.location
    try {
      const windowProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const windowHost = window.location.host;
      
      if (windowHost && !windowHost.includes('undefined')) {
        const fallbackUrl = `${windowProtocol}//${windowHost}/ws`;
        console.log('Usando URL di fallback per WebSocket:', fallbackUrl);
        return fallbackUrl;
      }
    } catch (fallbackError) {
      console.error('Anche il fallback per WebSocket URL è fallito:', fallbackError);
    }
    
    // Se tutto fallisce, usa un approccio basato sul dominio di Replit
    // Questo valore è hardcoded come ultima risorsa
    const replitDomain = document.location.hostname || 'replit.dev';
    return `wss://${replitDomain}/ws`;
  }
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
    // Debug Info
    console.log('WEBSOCKET DEBUG - HOST INFO:',
      '\nHostname:', window.location.hostname,
      '\nHost:', window.location.host,
      '\nProtocol:', window.location.protocol,
      '\nPort:', window.location.port,
      '\nPathname:', window.location.pathname,
      '\nHref:', window.location.href,
      '\nOrigin:', window.location.origin
    );
    
    // Approccio SEMPLIFICATO: usiamo direttamente la stessa origine della pagina corrente
    const origin = window.location.origin;
    // Sostituisci http con ws e https con wss
    const wsOrigin = origin.replace(/^http/, 'ws');
    const url = `${wsOrigin}/ws`;
    
    console.log('WEBSOCKET DEBUG - USANDO URL SEMPLIFICATO:', url);
    
    // Creazione diretta (senza token o parametri query)
    try {
      console.log('Creazione WebSocket con URL:', url);
      return new WebSocket(url);
    } catch (directError) {
      console.error('Errore nella creazione diretta WebSocket:', directError);
      
      // Fallback: prova con solo l'hostname di Replit
      if (window.location.hostname.includes('replit')) {
        try {
          const fallbackUrl = `wss://${window.location.host}/ws`;
          console.log('WEBSOCKET DEBUG - Fallback URL per Replit:', fallbackUrl);
          return new WebSocket(fallbackUrl);
        } catch (replitError) {
          console.error('Errore nella creazione WebSocket di fallback per Replit:', replitError);
        }
      }
    }
    
    // Ultimo tentativo: prova un URL più basico
    try {
      const lastResortUrl = window.location.protocol === 'https:' 
        ? `wss://${window.location.host}/ws`
        : `ws://${window.location.host}/ws`;
      
      console.log('WEBSOCKET DEBUG - Ultimo tentativo URL:', lastResortUrl);
      return new WebSocket(lastResortUrl);
    } catch (lastError) {
      console.error('Falliti tutti i tentativi di creazione WebSocket:', lastError);
      return null;
    }
  } catch (error) {
    console.error('Errore generale nella creazione della connessione WebSocket:', error);
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