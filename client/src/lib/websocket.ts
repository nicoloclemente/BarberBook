let socket: WebSocket | null = null;
let reconnectInterval: number | null = null;
const listeners = new Map<string, Set<(data: any) => void>>();

export function connectWebSocket(userId: number) {
  if (socket) {
    return;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log("WebSocket connected");
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

    // Attempt to reconnect
    if (!reconnectInterval) {
      reconnectInterval = window.setInterval(() => {
        connectWebSocket(userId);
      }, 5000);
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    socket?.close();
  };
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
