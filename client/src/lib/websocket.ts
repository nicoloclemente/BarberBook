let socket: WebSocket | null = null;
let reconnectInterval: number | null = null;
let heartbeatInterval: number | null = null;
const listeners = new Map<string, Set<(data: any) => void>>();
let currentUserId: number | null = null;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export function connectWebSocket(userId: number) {
  if (socket) {
    return;
  }
  
  currentUserId = userId;
  
  try {
    // Primo tentativo: URL completo basato sull'host attuale
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    console.log("Trying to connect to WebSocket:", wsUrl);
    
    socket = new WebSocket(wsUrl);
    setupWebSocketHandlers(userId);
  } catch (error) {
    console.error("Error creating WebSocket with primary URL:", error);
    fallbackWebSocketConnection(userId);
  }
}

function fallbackWebSocketConnection(userId: number) {
  console.log("Attempting fallback WebSocket connection...");
  try {
    // Usiamo 5000 come porta di fallback predefinita, oppure utilizziamo la porta corrente
    const port = window.location.port || '5000';
    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:${port}/ws`;
    console.log("Fallback WebSocket URL:", wsUrl);
    
    socket = new WebSocket(wsUrl);
    setupWebSocketHandlers(userId);
  } catch (error) {
    console.error("Error creating WebSocket with fallback URL:", error);
    socket = null;
    
    // Come ultima risorsa, prova con un URL semplice
    try {
      const simpleUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//` + 
                         `${window.location.hostname}/ws`;
      console.log("Attempting final websocket connection to:", simpleUrl);
      socket = new WebSocket(simpleUrl);
      setupWebSocketHandlers(userId);
    } catch (finalError) {
      console.error("All WebSocket connection attempts failed:", finalError);
      
      // Pianifica un nuovo tentativo di connessione, ma limita i tentativi
      connectionAttempts++;
      if (connectionAttempts < MAX_RECONNECT_ATTEMPTS && !reconnectInterval) {
        reconnectInterval = window.setInterval(() => {
          connectWebSocket(userId);
        }, 5000);
      } else if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error("Maximum WebSocket reconnection attempts reached");
      }
    }
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

  socket.onclose = () => {
    console.log("WebSocket disconnected, attempting to reconnect...");
    socket = null;

    // Attempt to reconnect, but with a limit
    connectionAttempts++;
    if (connectionAttempts < MAX_RECONNECT_ATTEMPTS && !reconnectInterval) {
      console.log(`WebSocket reconnection attempt ${connectionAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
      reconnectInterval = window.setInterval(() => {
        connectWebSocket(userId);
      }, 5000);
    } else if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error("Maximum WebSocket reconnection attempts reached");
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    // Non chiudiamo esplicitamente la socket in caso di errore,
    // poiché l'evento onclose verrà comunque attivato
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
