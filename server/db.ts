import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";

/**
 * Configurazione ottimizzata del pool di connessione PostgreSQL
 * Bilanciata per prestazioni e utilizzo efficiente delle risorse
 */
console.log('Inizializzazione connessione al database con:', 
  process.env.DATABASE_URL ? 'URL del database presente' : 'URL del database mancante');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  
  // Configurazione del pool per bilanciare prestazioni e risorse
  max: process.env.NODE_ENV === 'production' ? 20 : 10, // Più connessioni in produzione
  min: 2, // Manteniamo almeno 2 connessioni attive per evitare latenza
  
  // Gestione efficiente delle connessioni inattive
  idleTimeoutMillis: 30000, // 30 secondi di inattività massima
  
  // Timeout di connessione ragionevole
  connectionTimeoutMillis: 5000, // 5 secondi per stabilire una connessione
  
  // Strategie di resilienza
  allowExitOnIdle: false, // Non chiudere il pool all'uscita di Node
  keepAlive: true, // Mantiene le connessioni TCP in vita
  keepAliveInitialDelayMillis: 10000, // 10 secondi prima del primo keepalive
  
  // Utilizzo delle query preparate per prestazioni migliori
  statement_timeout: 10000, // 10 secondi timeout per le query
  query_timeout: 10000, // 10 secondi timeout per le query
  
  // SSL è richiesto per alcune configurazioni di database
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Monitoraggio e gestione degli errori
pool.on('error', (err) => {
  console.error('Errore di connessione al database:', err);
  // In produzione, potremmo voler riavviare il pool dopo errori critici
});

pool.on('connect', (client) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Nuova connessione al database stabilita');
  }
  
  // Imposta parametri di sessione ottimali per ogni nuova connessione
  client.query('SET application_name = "barber_shop_app"');
});

/**
 * Funzione per controllare lo stato della connessione al database
 * Utile per health checks e monitoraggio
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  console.log('Verifica connessione al database con URL:', 
              process.env.DATABASE_URL ? 'URL disponibile' : 'URL non disponibile');
  
  try {
    console.log('Tentativo di connessione al database...');
    const client = await pool.connect();
    try {
      console.log('Connessione stabilita, esecuzione query di test...');
      await client.query('SELECT 1');
      console.log('Query di test eseguita con successo');
      return true;
    } finally {
      client.release();
      console.log('Connessione rilasciata');
    }
  } catch (error) {
    console.error('Errore di connessione al database durante il controllo:', error);
    console.error('Dettagli errore:', JSON.stringify(error, null, 2));
    
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL non è impostato. Assicurati che sia configurato correttamente.');
    }
    
    return false;
  }
}

// Esporta l'istanza drizzle per l'uso in tutta l'applicazione
export const db = drizzle(pool, { schema });
export { pool };