import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";

// Ottimizzazione della connessione al database PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Riduciamo il numero massimo di connessioni per risparmiare memoria ma garantiamo un minimo
  max: 10,
  min: 1,
  // Impostiamo un timeout di inattività più lungo per evitare disconnessioni frequenti
  idleTimeoutMillis: 60000,
  // Aumentiamo il timeout di connessione per dare più tempo alla connessione di stabilirsi
  connectionTimeoutMillis: 10000,
});

// Gestione errori di connessione
pool.on('error', (err) => {
  console.error('Errore imprevisto del pool di connessione:', err);
});

// Esporta l'istanza drizzle per l'uso in tutta l'applicazione
export const db = drizzle(pool, { schema });
export { pool };