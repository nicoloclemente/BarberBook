let socket: WebSocket | null = null;
let reconnectInterval: number | null = null;
let heartbeatInterval: number | null = null;
const listeners = new Map<string, Set<(data: any) => void>>();
let currentUserId: number | null = null;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 3000;

export function connectWebSocket(userId: number) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log("WebSocket already connected");
    return;
  }
  
  if (socket && (socket.readyState === WebSocket.CONNECTING)) {
    console.log("WebSocket connection in progress");
    return;
  }
  
  // Chiudi la socket esistente se è in stato di closing
  if (socket) {
    try {
      socket.close();
    } catch (err) {
      console.error("Error closing existing socket:", err);
    }
    socket = null;
  }
  
  currentUserId = userId;
  connectionAttempts++;
  
  if (connectionAttempts > MAX_RECONNECT_ATTEMPTS) {
    console.error(`Maximum connection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
    return;
  }
  
  console.log(`WebSocket connection attempt ${connectionAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
  
  // URL principale per la connessione WebSocket (path /ws sul server attuale)
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  console.log("Connecting to WebSocket:", wsUrl);
  
  try {
    // Utilizziamo un blocco try-catch per gestire eventuali errori di creazione della WebSocket
    socket = new WebSocket(wsUrl);
    setupWebSocketHandlers(userId);
  } catch (error) {
    console.error("Error creating WebSocket:", error);
    socket = null;
    
    // Pianifica un nuovo tentativo con un ritardo
    setTimeout(() => {
      connectWebSocket(userId);
    }, RECONNECT_DELAY_MS);
  }
}

function setupWebSocketHandlers(userId: number) {
  if (!socket) return;
  
  socket.onopen = () => {
    console.log("WebSocket connected");
    connectionAttempts = 0; // Resetta i tentativi di connessione al successo
    
    // Authenticate with the server
    if (socket) {
      socket.send(JSON.stringify({ 
        type: 'authenticate', 
        userId 
      }));
    }

    // Clear reconnect interval if it exists
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
    
    // Set up heartbeat to keep the connection alive and track user activity
    if (!heartbeatInterval) {
      heartbeatInterval = window.setInterval(() => {
        sendHeartbeat();
      }, 60000); // Ogni minuto
    }
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      const eventListeners = listeners.get(message.type);
      
      if (eventListeners) {
        eventListeners.forEach(listener => listener(message.data));
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  };

  socket.onclose = (event) => {
    console.log(`WebSocket disconnected with code: ${event.code}, reason: ${event.reason || 'No reason provided'}`);
    
    // Evita il ricollegamento se la chiusura è stata intenzionale (codice 1000)
    if (event.code === 1000) {
      console.log("WebSocket closed normally, not reconnecting");
      socket = null;
      connectionAttempts = 0;
      return;
    }
    
    socket = null;
    
    // Pulisci gli intervalli esistenti prima di crearne di nuovi
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }

    // Utilizza setTimeout invece di setInterval per evitare sovrapposizioni
    if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
      console.log(`WebSocket reconnection attempt ${connectionAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${RECONNECT_DELAY_MS}ms`);
      setTimeout(() => {
        if (currentUserId) {
          connectWebSocket(currentUserId);
        }
      }, RECONNECT_DELAY_MS);
    } else {
      console.error("Maximum WebSocket reconnection attempts reached");
      connectionAttempts = 0; // Reset per consentire tentativi futuri dopo un po' di tempo
      setTimeout(() => {
        if (currentUserId) {
          connectionAttempts = 0;
          connectWebSocket(currentUserId);
        }
      }, RECONNECT_DELAY_MS * 5); // Attendi più a lungo prima di riprovare da capo
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error occurred:", error);
    
    // Non è necessario chiudere esplicitamente, ma registriamo informazioni utili per il debug
    if (socket) {
      console.log("Current WebSocket state:", getWebSocketStatus());
    }
    
    // Nota: onclose verrà chiamato automaticamente dopo la maggior parte degli errori
  };
}

export function sendHeartbeat() {
  if (socket && socket.readyState === WebSocket.OPEN && currentUserId) {
    socket.send(JSON.stringify({
      type: 'heartbeat',
      userId: currentUserId
    }));
  }
}

export function disconnectWebSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }

  if (reconnectInterval) {
    clearInterval(reconnectInterval);
    reconnectInterval = null;
  }
  
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  // Reset current user ID
  currentUserId = null;
  
  // Clear all listeners
  listeners.clear();
}

export function addEventListener(type: string, callback: (data: any) => void) {
  if (!listeners.has(type)) {
    listeners.set(type, new Set());
  }
  
  listeners.get(type)!.add(callback);
}

export function removeEventListener(type: string, callback: (data: any) => void) {
  const eventListeners = listeners.get(type);
  
  if (eventListeners) {
    eventListeners.delete(callback);
    
    if (eventListeners.size === 0) {
      listeners.delete(type);
    }
  }
}

export function getWebSocketStatus() {
  if (!socket) return 'disconnected';
  
  switch (socket.readyState) {
    case WebSocket.CONNECTING:
      return 'connecting';
    case WebSocket.OPEN:
      return 'connected';
    case WebSocket.CLOSING:
      return 'closing';
    case WebSocket.CLOSED:
      return 'closed';
    default:
      return 'unknown';
  }
}
