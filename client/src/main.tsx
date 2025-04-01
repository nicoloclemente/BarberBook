// Importa il polyfill WebSocket prima di tutto il resto
import "./lib/websocket-polyfill";

import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
