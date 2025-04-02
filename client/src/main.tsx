// Importa il polyfill WebSocket prima di tutto il resto
import "./lib/websocket-polyfill";

// Importa la registrazione del service worker
import "./lib/register-service-worker";

import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
