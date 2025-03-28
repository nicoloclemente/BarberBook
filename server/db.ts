import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";

// Ottimizzazione della connessione al database PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Riduciamo il numero massimo di connessioni per risparmiare memoria
  max: 10,
  // Impostiamo un timeout di inattività più breve per liberare connessioni inutilizzate
  idleTimeoutMillis: 30000,
  // Impostiamo un limite di tempo massimo per l'acquisizione di una connessione
  connectionTimeoutMillis: 2000,
});

// Gestione errori di connessione
pool.on('error', (err) => {
  console.error('Errore imprevisto del pool di connessione:', err);
});

// Esporta l'istanza drizzle per l'uso in tutta l'applicazione
export const db = drizzle(pool, { schema });
export { pool };