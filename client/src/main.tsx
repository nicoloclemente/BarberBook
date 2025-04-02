// Importa il polyfill WebSocket prima di tutto il resto
import "./lib/websocket-polyfill";

// Importa la registrazione del service worker
import "./lib/register-service-worker";

import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App";
import "./index.css";

// Funzione per inizializzare il rendering dell'applicazione
function initApp() {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error("Elemento root non trovato");
    return;
  }

  try {
    const root = createRoot(rootElement);
    
    // In produzione, evitiamo StrictMode per evitare problemi di doppio rendering
    // che potrebbero causare problemi di navigazione e pagine bianche
    if (import.meta.env.DEV) {
      root.render(
        <StrictMode>
          <App />
        </StrictMode>
      );
    } else {
      root.render(<App />);
    }
    
    console.log("App inizializzata con successo");
  } catch (error) {
    console.error("Errore durante l'inizializzazione dell'app:", error);
  }
}

// Inizializza l'app
initApp();
