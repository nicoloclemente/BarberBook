/**
 * Polyfill per risolvere i problemi di connessione WebSocket
 * 
 * Questo file intercetta le creazioni di WebSocket prima che vengano 
 * inviate con URL non validi che causano errori.
 */

// Evita di eseguire in ambienti non browser (come SSR)
if (typeof window !== 'undefined' && window.WebSocket) {
  // Salva una copia del costruttore WebSocket originale
  const OriginalWebSocket = window.WebSocket;

  // Sostituisci il costruttore WebSocket con una versione personalizzata
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).WebSocket = function CustomWebSocket(url: string, protocols?: string | string[]) {
    try {
      // Verifica se l'URL contiene localhost:undefined o altri URL problematici
      if (url.includes('localhost:undefined') || 
          url.includes('undefined') ||
          (url.includes('/?token=') && !url.includes('/ws'))) {
            
        console.log('Intercepted problematic WebSocket URL:', url);
        
        // Se l'URL ha un problema, sostituiscilo con uno valido
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const validUrl = `${protocol}//${window.location.host}/ws`;
        console.log('Using valid WebSocket URL instead:', validUrl);
        
        // Crea un WebSocket con l'URL valido
        return new OriginalWebSocket(validUrl, protocols);
      }
      
      // Altrimenti usa il WebSocket originale
      return new OriginalWebSocket(url, protocols);
    } catch (error) {
      console.error('Error in WebSocket constructor:', error);
      
      // In caso di errore, proviamo a creare un WebSocket con l'URL standard
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const fallbackUrl = `${protocol}//${window.location.host}/ws`;
        console.log('Fallback to standard WebSocket URL:', fallbackUrl);
        return new OriginalWebSocket(fallbackUrl, protocols);
      } catch (fallbackError) {
        console.error('Critical error creating WebSocket, even with fallback:', fallbackError);
        throw fallbackError; // Rilanciamo l'errore per consentire la gestione esterna
      }
    }
  } as any;

  // Copia le proprietà statiche
  Object.assign(window.WebSocket, OriginalWebSocket);
  window.WebSocket.prototype = OriginalWebSocket.prototype;
  
  console.log('WebSocket polyfill installed successfully');
}

export {}; // Esporta un oggetto vuoto per soddisfare la sintassi del modulo