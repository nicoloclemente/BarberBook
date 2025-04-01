import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { appointmentScheduler } from "./scheduler";
import { checkDatabaseConnection } from "./db";
import { setupAuth } from "./auth";
import compression from "compression";

// Configurazione dell'applicazione Express
const app = express();

// Middleware per ottimizzazione delle prestazioni
app.use(compression()); // Compressione gzip per ridurre la dimensione delle risposte

// Parser per JSON e form data
app.use(express.json({ limit: '1mb' })); // Limita la dimensione delle richieste JSON
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Set di sicurezza ed header di default
app.disable('x-powered-by'); // Rimuove l'header X-Powered-By per sicurezza

// CORS per sviluppo locale (se necessario)
if (process.env.NODE_ENV === 'development') {
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });
}

// Middleware per logging e monitoraggio delle richieste API
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Cattura le risposte JSON per logging
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Logging completo delle richieste e risposte API con tempo di esecuzione
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const isSlowRequest = duration > 500; // Evidenzia richieste lente (>500ms)
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Aggiungi dettagli della risposta per debug (solo in development)
      if (process.env.NODE_ENV === 'development' && capturedJsonResponse) {
        const responseSummary = JSON.stringify(capturedJsonResponse);
        logLine += ` :: ${responseSummary.length > 50 ? responseSummary.slice(0, 50) + '...' : responseSummary}`;
      }
      
      if (isSlowRequest) {
        logLine = `⚠️ SLOW REQUEST: ${logLine}`;
        console.warn(logLine);
      } else {
        log(logLine);
      }
    }
  });

  next();
});

// Inizializzazione dell'applicazione
(async () => {
  try {
    // Verifica connessione al database all'avvio
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      console.error('❌ Impossibile connettersi al database. Avvio fallito.');
      process.exit(1);
    }
    
    log('✅ Connessione al database PostgreSQL stabilita');
    
    // Configura l'autenticazione
    setupAuth(app);
    
    // Registra tutte le route API
    const server = await registerRoutes(app);
    
    // Middleware per la gestione centralizzata degli errori
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Errore interno del server";
      
      // Log dettagliato degli errori
      console.error(`❌ [ERROR ${status}]`, err.stack || err);
      
      // Risposta al cliente
      return res.status(status).json({ 
        error: message,
        status,
        timestamp: new Date().toISOString()
      });
    });

    // Configurazione Vite/Static in base all'ambiente
    if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
      try {
        await setupVite(app, server);
        log('✅ Configurazione Vite completata con successo');
      } catch (error) {
        console.error('❌ Errore nella configurazione di Vite:', error);
        process.exit(1);
      }
    } else {
      try {
        serveStatic(app);
        log('✅ Configurazione statica completata con successo');
      } catch (error) {
        // In caso di errore nella modalità statica (probabile assenza della directory 'public'),
        // prova ad utilizzare Vite come fallback
        log('⚠️ Errore nella configurazione statica, tentativo di fallback a Vite');
        await setupVite(app, server);
      }
    }

    // Avvia lo scheduler degli appuntamenti
    appointmentScheduler.startScheduler();
    log('✅ Scheduler di appuntamenti avviato');

    // Avvia il server
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`✅ Server avviato con successo sulla porta ${port}`);
      log(`🚀 Barbershop App pronta all'uso!`);
    });
    
    // Gestione graceful shutdown
    const shutdown = async () => {
      log('👋 Arresto del server in corso...');
      
      // Ferma lo scheduler
      appointmentScheduler.stopScheduler();
      
      // Chiudi il server
      server.close(() => {
        log('✅ Server HTTP arrestato');
        process.exit(0);
      });
      
      // Forza la chiusura dopo 10 secondi se il server non si chiude normalmente
      setTimeout(() => {
        log('⚠️ Forzando la chiusura del server dopo timeout');
        process.exit(1);
      }, 10000);
    };
    
    // Gestione dei segnali per shutdown graceful
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    console.error('❌ Errore critico durante l\'avvio del server:', error);
    process.exit(1);
  }
})();
